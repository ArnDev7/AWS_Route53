import re
from typing import List, Dict, Any, Tuple

def parse_bind_zone(content: str, default_origin: str = "") -> List[Dict[str, Any]]:
    """
    Parses a BIND zone file content and returns a list of dictionaries 
    representing DNS records suitable for schemas.DNSRecordCreate.
    """
    lines = content.splitlines()
    origin = default_origin.strip()
    if origin and not origin.endswith("."):
        origin += "."
    
    default_ttl = 300
    records: List[Dict[str, Any]] = []
    
    # Track state for multiline SOA records (parenthesis blocks)
    in_parenthesis = False
    paren_buffer = []
    current_record_line = ""

    # Supported types
    supported_types = {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"}

    for line in lines:
        # Strip trailing comments (but keep comments in Quotes for TXT records if needed, simple strip here)
        # BIND comment starts with semicolon ';'
        # Regex to strip semicolon comments not enclosed in quotes
        line_clean = ""
        in_quotes = False
        for char in line:
            if char == '"':
                in_quotes = not in_quotes
            if char == ';' and not in_quotes:
                break
            line_clean += char
        
        line_clean = line_clean.strip()
        if not line_clean:
            continue
            
        # Parse $ORIGIN
        if line_clean.upper().startswith("$ORIGIN"):
            parts = line_clean.split()
            if len(parts) > 1:
                origin = parts[1]
                if not origin.endswith("."):
                    origin += "."
            continue
            
        # Parse $TTL
        if line_clean.upper().startswith("$TTL"):
            parts = line_clean.split()
            if len(parts) > 1:
                try:
                    default_ttl = int(parts[1])
                except ValueError:
                    pass
            continue

        # Handle paren block
        if "(" in line_clean:
            in_parenthesis = True
            current_record_line = line_clean.split("(")[0]
            paren_buffer = []
            right_part = line_clean.split("(")[1]
            if ")" in right_part:
                # Same-line match
                paren_buffer.append(right_part.split(")")[0])
                in_parenthesis = False
                current_record_line += " " + " ".join(paren_buffer)
            else:
                paren_buffer.append(right_part)
                continue
        elif in_parenthesis:
            if ")" in line_clean:
                in_parenthesis = False
                paren_buffer.append(line_clean.split(")")[0])
                current_record_line += " " + " ".join(paren_buffer)
            else:
                paren_buffer.append(line_clean)
                continue
        else:
            current_record_line = line_clean

        # Now parse the current record line
        # Format can be: [name] [ttl] [class] [type] [value]
        # E.g.:
        # @ IN MX 10 mail.example.com.
        # www 3600 IN A 192.0.2.1
        # mail A 192.0.2.2
        # txt IN TXT "v=spf1 include:_spf.google.com ~all"
        parts = current_record_line.split()
        if not parts:
            continue

        # Let's inspect fields to locate the DNS record type
        type_idx = -1
        for i, part in enumerate(parts):
            if part.upper() in supported_types:
                type_idx = i
                break
        
        if type_idx == -1:
            # Could not find a valid record type, skip
            continue
        
        # Name is everything before type, minus TTL and CLASS "IN"
        name_parts = parts[:type_idx]
        rec_ttl = default_ttl
        
        # Filter out "IN" and optional numeric TTL from name parts
        final_name_parts = []
        for p in name_parts:
            if p.upper() == "IN":
                continue
            if p.isdigit():
                rec_ttl = int(p)
                continue
            final_name_parts.append(p)
            
        rec_name = final_name_parts[0] if final_name_parts else "@"
        
        # Resolve "@" and subdomains
        if rec_name == "@":
            rec_name = origin
        elif not rec_name.endswith("."):
            if origin:
                rec_name = f"{rec_name}.{origin}"
            else:
                rec_name = f"{rec_name}."

        rec_type = parts[type_idx].upper()
        
        # Value is everything after the type
        # Restore quotes for values if they were parsed out or keep string intact
        # Regex or split might have eaten spacing. Let's rebuild the value from the original clean line
        val_parts = parts[type_idx+1:]
        rec_val = " ".join(val_parts).strip()
        
        # Append record (merge if name and type are identical to avoid creating duplicates, adding as newline value)
        merged = False
        for rec in records:
            if rec["name"] == rec_name and rec["type"] == rec_type:
                # Merge value
                rec["value"] = rec["value"] + "\n" + rec_val
                merged = True
                break
                
        if not merged:
            records.append({
                "name": rec_name,
                "type": rec_type,
                "value": rec_val,
                "ttl": rec_ttl,
                "routing_policy": "Simple"
            })
            
    return records


def export_to_bind_format(zone_name: str, records: List[Any]) -> str:
    """
    Exports a list of DNSRecord DB models or schemas into a BIND zone file string.
    """
    origin = zone_name if zone_name.endswith(".") else zone_name + "."
    out = [
        f"; BIND Zone file generated for {origin}",
        f"$ORIGIN {origin}",
        "$TTL 300",
        ""
    ]
    
    # Sort records to render NS & SOA first, then alphabetized
    def sort_key(r):
        t = r.type.upper()
        if t == "SOA": return (0, r.name)
        if t == "NS": return (1, r.name)
        return (2, r.name)
    
    sorted_recs = sorted(records, key=sort_key)
    
    for r in sorted_recs:
        # Determine relative name to keep the print clean
        rel_name = r.name
        if rel_name == origin:
            rel_name = "@"
        elif rel_name.endswith("." + origin):
            rel_name = rel_name[:-len("." + origin)]
            
        # Clean multiline values.
        # BIND expects multiple values to be printed as separate lines
        vals = r.value.split("\n")
        for val in vals:
            val_clean = val.strip()
            if not val_clean:
                continue
            
            # Special printing format for SOA records
            if r.type.upper() == "SOA":
                # Print SOA with parentheses format
                # val_clean is like: "ns-server.awsdns.com. hostmaster.awsdns.com. 1 7200 900 1209600 86400"
                soa_parts = val_clean.split()
                if len(soa_parts) >= 7:
                    ns_serv = soa_parts[0]
                    hmaster = soa_parts[1]
                    serial = soa_parts[2]
                    refresh = soa_parts[3]
                    retry = soa_parts[4]
                    expire = soa_parts[5]
                    min_ttl = soa_parts[6]
                    
                    out.append(f"{rel_name:<16} {r.ttl:<6} IN  SOA {ns_serv} {hmaster} (")
                    out.append(f"            {serial:<12} ; serial")
                    out.append(f"            {refresh:<12} ; refresh")
                    out.append(f"            {retry:<12} ; retry")
                    out.append(f"            {expire:<12} ; expire")
                    out.append(f"            {min_ttl:<12} ; minimum TTL")
                    out.append("        )")
                else:
                    out.append(f"{rel_name:<16} {r.ttl:<6} IN  SOA {val_clean}")
            else:
                out.append(f"{rel_name:<16} {r.ttl:<6} IN  {r.type:<5} {val_clean}")
                
    return "\n".join(out)
