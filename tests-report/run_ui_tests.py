import json, subprocess, time, sys, threading, http.server, socketserver, os, functools
from playwright.sync_api import sync_playwright

ROOT = '/home/claude/agricultural-platform-fixed'
PORT = 8791
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k): pass
Handler = functools.partial(Quiet, directory=ROOT)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler); httpd.allow_reuse_address = True
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{PORT}'

stub = open('/home/claude/tests/stub_supabase.js', encoding='utf-8').read()
fix = open('/home/claude/tests/fixtures.js', encoding='utf-8').read()
results = []
def check(name, cond, extra=''):
    results.append((name, bool(cond), extra)); print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if (extra and not cond) else ''))

def new_page(browser, mode='ok', width=1280, height=900, scheme='dark'):
    ctx = browser.new_context(viewport={'width': width, 'height': height}, color_scheme=scheme)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('console.error: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    def route(r):
        url = r.request.url
        if 'cdn.jsdelivr.net/npm/@supabase' in url:
            r.fulfill(status=200, content_type='application/javascript', body=f"window.__MODE__='{mode}';\n{fix}\n{stub}")
        elif url.startswith(BASE):
            r.continue_()
        else:
            r.abort()   # الخطوط والتحليلات: غير متاحة في بيئة الاختبار
    ctx.route('**/*', route)
    return page, errors

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- صفحة الأرشيف ----------
    page, errs = new_page(b)
    page.goto(f'{BASE}/graduation/graduation.html'); page.wait_for_selector('.gp-card')
    cards = page.locator('.gp-card').count()
    check('الأرشيف: يعرض المنشور فقط (4 بطاقات ولا مسودة)', cards == 4, cards)
    check('الأرشيف: لا تظهر المسودة في الصفحة', 'مسودة سري' not in page.inner_text('body'))
    stats = page.locator('.gp-stat strong').all_inner_texts()
    check('الإحصائيات: 4 مشاريع / 3 دفعات / 4 أقسام', stats == ['٤', '٣', '٤'], stats)
    q = page.evaluate('window.__queries')
    check('الاستعلام يطلب is_published=true صراحةً', any(['is_published', True] in x['filters'] for x in q))
    check('الاستعلام يحدد الأعمدة (لا *)', all('*' not in x['cols'] for x in q if x['table'] == 'graduation_projects'))
    check('بطاقة تعرض الغلاف والسنة والقسم والمجال والوصف والرابط',
          page.locator('.gp-card').first.locator('img.gp-card__img').count() == 1 and
          '2025' in page.locator('.gp-card').first.inner_text() and
          'هندسة نظم المياه' in page.locator('.gp-card').first.inner_text() and
          'الري' in page.locator('.gp-card').first.inner_text() and
          'عرض التفاصيل' in page.locator('.gp-card').first.inner_text())
    href = page.locator('.gp-card').first.locator('a.gp-card__more').get_attribute('href')
    check('رابط البطاقة قابل للمشاركة', href == 'project.html?slug=smart-irrigation-2025', href)
    check('الترتيب الافتراضي الأحدث أولًا', page.locator('.gp-card h3').first.inner_text().startswith('نظام ري'))

    def count(): return page.locator('.gp-card').count()
    page.fill('#gradSearch', 'ري'); page.wait_for_timeout(400)
    check('بحث بالاسم/الكلمة المفتاحية (ري)', count() >= 1 and 'نظام ري' in page.locator('.gp-card h3').first.inner_text(), count())
    page.fill('#gradSearch', 'طاقه شمسيه'); page.wait_for_timeout(400)   # تطبيع ة/ه
    check('البحث يتجاهل الفرق بين ة/ه (طاقه شمسيه → مشروعان)', count() == 2, count())
    page.fill('#gradSearch', 'حساسات'); page.wait_for_timeout(400)
    check('بحث بالكلمات المفتاحية (حساسات)', count() == 1)
    page.fill('#gradSearch', 'احتراق'); page.wait_for_timeout(400)
    check('بحث بالوصف (احتراق)', count() == 1 and 'محرك' in page.locator('.gp-card h3').first.inner_text())
    page.fill('#gradSearch', 'كلمةغيرموجودة'); page.wait_for_timeout(400)
    check('حالة «لا توجد نتائج»', count() == 0 and 'لا توجد مشاريع مطابقة' in page.inner_text('#gradStatus'))
    check('عدّاد النتائج = 0', page.inner_text('#gradCount').strip() == '٠')
    page.click('#gradReset'); page.wait_for_timeout(100)
    check('إعادة الضبط تعيد 4 بطاقات', count() == 4 and page.input_value('#gradSearch') == '')

    page.select_option('#gradDept', 'هندسة القوى والآلات الزراعية')
    check('فلتر القسم', count() == 1)
    page.click('#gradReset')
    page.select_option('#gradYear', '2024'); check('فلتر السنة (2024 → 2)', count() == 2, count())
    page.select_option('#gradType', 'تصميم وتصنيع'); check('فلتر النوع + السنة معًا (→ 1)', count() == 1, count())
    page.click('#gradReset')
    page.select_option('#gradField', 'التحكم البيئي'); check('فلتر المجال', count() == 1)
    page.click('#gradReset')
    page.select_option('#gradSort', 'oldest'); check('ترتيب الأقدم أولًا', page.locator('.gp-card h3').first.inner_text().startswith('صوبة'))
    page.select_option('#gradSort', 'name')
    titles = page.locator('.gp-card h3').all_inner_texts()
    check('ترتيب بالاسم', titles == sorted(titles, key=lambda t: t), titles)
    options = page.locator('#gradYear option').all_inner_texts()
    check('خيارات السنة من البيانات الحقيقية فقط', options[1:] == ['2025', '2024', '2023'], options)
    check('لا أخطاء Console في الأرشيف', not errs, errs)

    # ---------- الوضع الليلي/النهاري ----------
    bg_dark = page.evaluate("getComputedStyle(document.querySelector('.gp-card')).backgroundColor")
    page.evaluate('toggleTheme()'); page.wait_for_timeout(600)
    bg_light = page.evaluate("getComputedStyle(document.querySelector('.gp-card')).backgroundColor")
    font = page.evaluate("getComputedStyle(document.body).fontFamily")
    check('الوضعان الليلي والنهاري يغيّران ألوان البطاقة', bg_dark != bg_light, (bg_dark, bg_light))
    check('الخط Cairo معتمد', 'Cairo' in font, font)
    check('الاتجاه RTL', page.evaluate("document.documentElement.dir") == 'rtl')

    # ---------- التجاوب بدون تمرير أفقي ----------
    for w in (375, 768, 1280):
        page.set_viewport_size({'width': w, 'height': 900}); page.wait_for_timeout(150)
        over = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(f'لا تمرير أفقي في الأرشيف عند عرض {w}px', over <= 0, over)
    page.screenshot(path='/home/claude/tests/archive_mobile.png', full_page=False)
    page.set_viewport_size({'width': 1280, 'height': 900}); page.screenshot(path='/home/claude/tests/archive_desktop.png')
    page.context.close()

    # ---------- حالات: تحميل / خطأ / جدول غير موجود / فارغ ----------
    page, errs = new_page(b, 'slow'); page.goto(f'{BASE}/graduation/graduation.html')
    page.wait_for_selector('.gp-status--loading'); check('حالة التحميل تظهر', True)
    page.wait_for_selector('.gp-card'); page.context.close()

    page, errs = new_page(b, 'error'); page.goto(f'{BASE}/graduation/graduation.html'); page.wait_for_selector('.gp-status--error')
    check('حالة الخطأ + زر إعادة المحاولة', page.locator('.gp-status--error button').count() == 1 and page.locator('#gradControls').is_hidden())
    page.context.close()
    page, errs = new_page(b, 'missing_table'); page.goto(f'{BASE}/graduation/graduation.html'); page.wait_for_selector('.gp-status--error')
    check('رسالة واضحة عند غياب الجدول', 'غير مُنشأ' in page.inner_text('#gradStatus')); page.context.close()
    page, errs = new_page(b, 'empty'); page.goto(f'{BASE}/graduation/graduation.html'); page.wait_for_selector('.gp-status--empty')
    stats = page.locator('.gp-stat strong').all_inner_texts()
    check('حالة الفراغ + إحصائيات صفرية صادقة', stats == ['٠', '٠', '٠'] and 'لم تُنشر مشاريع' in page.inner_text('#gradStatus'), stats)
    page.context.close()

    # ---------- صفحة التفاصيل ----------
    page, errs = new_page(b); page.goto(f'{BASE}/graduation/project.html?slug=smart-irrigation-2025'); page.wait_for_selector('.gp-title')
    body = page.inner_text('#gradProject')
    for label, text in [('الاسم', 'نظام ري ذكي'), ('النبذة', 'نبذة عن المشروع'), ('المشكلة', 'المشكلة التي يعالجها'), ('الأهداف', 'تقليل الهدر'),
                        ('طريقة التنفيذ', 'طريقة التنفيذ'), ('القسم', 'هندسة نظم المياه والرى'), ('السنة', '2025'), ('الطلاب', 'سارة محمود'),
                        ('المشرف', 'د. أحمد علي'), ('المعرض', 'معرض الصور'), ('الفيديو', 'فيديو توضيحي'), ('المراجع', 'مرجع الفاو')]:
        check(f'التفاصيل تعرض: {label}', text in body)
    check('عنوان الصفحة يتغير باسم المشروع', page.title().startswith('نظام ري ذكي'), page.title())
    check('تقرير PDF رابط يفتح في تبويب جديد آمن', page.locator('a[href="https://example.test/report.pdf"][rel~="noopener"]').count() == 1)
    check('رابط javascript: في المراجع مستبعد', page.locator('a[href^="javascript"]').count() == 0)
    check('فيديو يوتيوب يُضمَّن بنطاق nocookie', page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/"]').count() == 1)
    page.locator('.gp-gallery__item').first.click()
    check('فتح الصورة بالحجم الكامل', page.locator('.gp-lightbox').count() == 1 and 'g1.png' in page.locator('.gp-lightbox__img').get_attribute('src'))
    page.keyboard.press('ArrowLeft'); check('السهم الأيسر = التالي في RTL', 'g2.png' in page.locator('.gp-lightbox__img').get_attribute('src'))
    page.keyboard.press('ArrowRight'); page.keyboard.press('ArrowRight'); check('التفاف للأخيرة', 'g3.png' in page.locator('.gp-lightbox__img').get_attribute('src'))
    page.keyboard.press('Escape'); check('Esc يغلق العارض ويعيد التمرير', page.locator('.gp-lightbox').count() == 0 and page.evaluate("!document.body.classList.contains('gp-no-scroll')"))
    for w in (375, 1280):
        page.set_viewport_size({'width': w, 'height': 900}); page.wait_for_timeout(150)
        check(f'لا تمرير أفقي في التفاصيل عند {w}px', page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth') <= 0)
    page.screenshot(path='/home/claude/tests/project_mobile.png', full_page=True) if False else None
    check('لا أخطاء Console في التفاصيل', not errs, errs); page.context.close()

    page, errs = new_page(b); page.goto(f'{BASE}/graduation/project.html?slug=tractor-engine-2024'); page.wait_for_selector('.gp-title')
    body = page.inner_text('#gradProject')
    check('الحقول الاختيارية غير المتوفرة لا تظهر (نبذة/مشكلة/أهداف/معرض/فيديو/مراجع/تقرير/طلاب)',
          all(t not in body for t in ['نبذة عن المشروع', 'المشكلة التي يعالجها', 'أهداف المشروع', 'معرض الصور', 'فيديو توضيحي', 'المراجع والروابط', 'تقرير المشروع', 'الطلاب المشاركون', 'الدكتور المشرف']))
    check('لا غلاف ولا أخطاء عند غياب الصورة', page.locator('.gp-cover').count() == 0 and not errs, errs); page.context.close()

    for slug, label in [('draft-secret-2026', 'مسودة'), ('no-such-project', 'غير موجود'), ('BAD SLUG!!', 'رابط غير صالح'), ('', 'بدون slug')]:
        page, errs = new_page(b); page.goto(f'{BASE}/graduation/project.html?slug={slug}'); page.wait_for_selector('.gp-status--missing')
        check(f'الرابط المباشر ({label}) يعرض «غير موجود» ولا يسرّب البيانات', 'سري' not in page.inner_text('body') and page.locator('.gp-status--missing a').count() == 1)
        page.context.close()
    b.close()

failed = [r for r in results if not r[1]]
print(f'\n{len(results)-len(failed)}/{len(results)} passed')
json.dump(results, open('/home/claude/tests/ui_results.json', 'w'), ensure_ascii=False)
sys.exit(1 if failed else 0)
