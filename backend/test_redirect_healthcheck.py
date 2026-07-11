import http.server
import threading
import time
import socket
import urllib.request
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine, Column, String, Integer, DateTime
import datetime
import random
import string

# Create a temporary sqlite DB for testing
Base = declarative_base()

def generate_health_check_id():
    chars = string.ascii_lowercase + string.digits
    return "hc-" + "".join(random.choices(chars, k=10))

class HealthCheck(Base):
    __tablename__ = "health_checks"
    id = Column(String, primary_key=True, default=generate_health_check_id)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, default="ENDPOINT")
    ip_address = Column(String, nullable=True)
    domain_name = Column(String, nullable=True)
    protocol = Column(String, nullable=False, default="HTTP")
    port = Column(Integer, nullable=False, default=80)
    path = Column(String, nullable=True, default="/")
    status = Column(String, nullable=False, default="Healthy")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

# A simple HTTP server to mock various response codes and track hits
received_requests = []

class MockServerRequestHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress logging to keep console clean
        return

    def do_GET(self):
        received_requests.append(self.path)
        
        if self.path == "/redirect":
            # Send redirect status code pointing to /target
            self.send_response(302)
            self.send_header("Location", "/target")
            self.end_headers()
            self.wfile.write(b"Redirecting...")
        elif self.path == "/target":
            # The target response
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Target Reached")
        elif self.path == "/ok":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"OK")
        elif self.path == "/error":
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"Server Error")
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

def run_mock_server(port):
    server = http.server.HTTPServer(('127.0.0.1', port), MockServerRequestHandler)
    print(f"Mock server running on 127.0.0.1:{port}")
    server.serve_forever()

# Custom redirect handler logic from backend/app/main.py
class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.request.HTTPError(req.full_url, code, msg, headers, fp)

def run_single_probe(hc, port):
    target = hc.ip_address or hc.domain_name
    new_status = "Healthy"
    try:
        if hc.protocol.upper() == "TCP":
            with socket.create_connection((target, hc.port), timeout=2):
                pass
        else:
            slash_path = "/" + hc.path.lstrip("/") if hc.path else "/"
            url = f"{hc.protocol.lower()}://{target.rstrip('/')}:{hc.port}{slash_path}"
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'AWS-Route53-Clone-Host-Probe/1.0'}
            )
            opener = urllib.request.build_opener(NoRedirectHandler())
            try:
                resp = opener.open(req, timeout=2)
                code = resp.getcode()
            except urllib.request.HTTPError as he:
                code = he.code

            # 200 to 399 are valid healthy endpoints
            if 200 <= code < 400:
                new_status = "Healthy"
            else:
                new_status = "Unhealthy"
    except Exception as e:
        print(f"Probe exception: {e}")
        new_status = "Unhealthy"
    return new_status

def test_suite():
    # 1. Start Mock Server in a background thread on a random free port
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
    sock.close()

    server_thread = threading.Thread(target=run_mock_server, args=(port,), daemon=True)
    server_thread.start()
    time.sleep(1) # wait for startup

    # 2. Setup SQLite db in memory
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Create health check items
        hc_ok = HealthCheck(name="ok-check", ip_address="127.0.0.1", protocol="HTTP", port=port, path="/ok", status="Unknown")
        hc_redirect = HealthCheck(name="redirect-check", ip_address="127.0.0.1", protocol="HTTP", port=port, path="/redirect", status="Unknown")
        hc_err = HealthCheck(name="error-check", ip_address="127.0.0.1", protocol="HTTP", port=port, path="/error", status="Unknown")
        
        db.add_all([hc_ok, hc_redirect, hc_err])
        db.commit()

        # Run probes
        print("\n--- Running Probes ---")
        status_ok = run_single_probe(hc_ok, port)
        status_redirect = run_single_probe(hc_redirect, port)
        status_err = run_single_probe(hc_err, port)

        print(f"OK check status resolved: {status_ok} (expected: Healthy)")
        print(f"Redirect check status resolved: {status_redirect} (expected: Healthy)")
        print(f"Error check status resolved: {status_err} (expected: Unhealthy)")
        print(f"Received requests on Mock Server: {received_requests}")

        # Assertions
        assert status_ok == "Healthy", "OK check failed!"
        assert status_redirect == "Healthy", "Redirect check failed!"
        assert status_err == "Unhealthy", "Error check failed!"
        
        # Crucial check: Redirect target /target MUST NOT have been accessed
        assert "/redirect" in received_requests, "Redirect endpoint not accessed!"
        assert "/target" not in received_requests, "ERROR: Probe followed the redirect to /target!"
        
        print("\nSUCCESS: Redirect handled correctly (treated as Healthy directly, and NOT followed)!")

    finally:
        db.close()

if __name__ == "__main__":
    test_suite()
