import threading,http.server,socketserver,functools
from playwright.sync_api import sync_playwright
R='/home/claude/agricultural-platform-fixed';P=8793
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a,**k):pass
socketserver.TCPServer.allow_reuse_address=True
h=socketserver.TCPServer(('127.0.0.1',P),functools.partial(Q,directory=R));threading.Thread(target=h.serve_forever,daemon=True).start()
stub=open('stub_supabase.js').read()
rooms="window.__FIXTURES__=[];"
with sync_playwright() as p:
    b=p.chromium.launch()
    for path in ['index.html','about/about.html','about/room.html?room=x','faculty/faculty.html','community/community.html','tools/tools.html','admin/index.html','student_dashboard/index.html']:
        c=b.new_context();pg=c.new_page();errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        c.route('**/*',lambda r:(r.fulfill(status=200,content_type='application/javascript',body=rooms+stub) if 'cdn.jsdelivr.net/npm/@supabase' in r.request.url else r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{P}') else r.abort()))
        pg.goto(f'http://127.0.0.1:{P}/{path}');pg.wait_for_timeout(700)
        print(('PASS ' if not errs else 'FAIL ')+path,errs[:2]);c.close()
    b.close()
