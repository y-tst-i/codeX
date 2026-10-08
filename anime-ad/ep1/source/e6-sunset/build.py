import math, re
d = '/tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/vid/ep1/work/e6-sunset/'
src = open(d + 'src.tpl', encoding='utf-8').read()
def inline(name):
    s = open(d + 'assets/' + name, encoding='utf-8').read()
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r'<svg [^>]*>', '<svg viewBox="0 0 520 900" width="520" height="900">', s, count=1)
    return s
ring = ','.join('%.2fpx %.2fpx 0 #0a0a12' % (3 * math.cos(a * math.pi / 12), 3 * math.sin(a * math.pi / 12)) for a in range(24))
out = src.replace('<!--HERO-->', inline('hero.svg')).replace('<!--LEON-->', inline('leon.svg')).replace('__RING__', ring)
open(d + 'index.html', 'w', encoding='utf-8').write(out)
print(len(out))
