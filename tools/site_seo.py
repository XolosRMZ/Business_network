#!/usr/bin/env python3
"""Validate crawlable pages and regenerate the sitemap. Python 3, no dependencies.

    python3 tools/site_seo.py --write-sitemap
    python3 tools/site_seo.py

No timestamps are invented. Fragment templates and tool/document folders are not pages.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote, urljoin
from collections import Counter
import argparse
import json
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://xolosarmy.xyz'
NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags=[];self.title=[];self.in_title=False;self.h1=0;self.jsonld=[];self.in_json=False
        self.feed(source)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);self.tags.append((tag,a))
        if tag=='title':self.in_title=True
        if tag=='h1':self.h1+=1
        if tag=='script' and a.get('type')=='application/ld+json':self.in_json=True;self.jsonld.append('')
    def handle_startendtag(self,tag,attrs): self.handle_starttag(tag,attrs);self.handle_endtag(tag)
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if tag=='script':self.in_json=False
    def handle_data(self,data):
        if self.in_title:self.title.append(data)
        if self.in_json:self.jsonld[-1]+=data
    def meta(self,key):
        return [a.get('content','') for tag,a in self.tags if tag=='meta' and (a.get('name','').lower()==key or a.get('property','').lower()==key)]
    def links(self,rel): return [a.get('href','') for tag,a in self.tags if tag=='link' and rel in a.get('rel','').split()]

def pages():
    for p in sorted(ROOT.rglob('*.html')):
        if any(part in ('components','tools','docs','.git') for part in p.relative_to(ROOT).parts):continue
        yield p

def canonical(path):
    relative=path.relative_to(ROOT).as_posix()
    return ORIGIN+'/'+(relative[:-10] if relative.endswith('index.html') else relative)

def local_file(url):
    path=ROOT/unquote(urlsplit(url).path).lstrip('/')
    return path/'index.html' if path.is_dir() else path

def make_sitemap(paths):
    ET.register_namespace('',NAMESPACE)
    root=ET.Element('{'+NAMESPACE+'}urlset')
    for path in sorted(paths,key=lambda p:(p!=ROOT/'index.html',canonical(p))):
        url=ET.SubElement(root,'{'+NAMESPACE+'}url')
        ET.SubElement(url,'{'+NAMESPACE+'}loc').text=canonical(path)
    ET.indent(root,space='  ')
    return ET.tostring(root,encoding='unicode',xml_declaration=True)+'\n'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write-sitemap',action='store_true');args=parser.parse_args()
    paths=list(pages());errors=[];warnings=[];portals=0
    if args.write_sitemap:(ROOT/'sitemap.xml').write_text(make_sitemap(paths),encoding='utf-8')
    for p in paths:
        name=p.relative_to(ROOT).as_posix();source=p.read_text(encoding='utf-8');page=Page(source);url=canonical(p)
        def require(condition,message):
            if not condition:errors.append(f'{name}: {message}')
        require(bool(''.join(page.title).strip()),'missing title')
        require(len([t for t,a in page.tags if t=='title'])==1,'expected one title')
        require(len(page.meta('description'))==1 and bool(page.meta('description')[0].strip()),'expected one nonempty description')
        require(page.links('canonical')==[url],'canonical must be the one existing page URL')
        require(page.meta('og:url')==[url],'Open Graph URL differs from canonical')
        require(bool(page.meta('og:title')) and bool(page.meta('og:description')),'missing Open Graph text')
        require(bool(page.meta('twitter:title')) and bool(page.meta('twitter:description')),'missing X/Twitter text')
        require(bool(page.jsonld),'missing structured data')
        for block in page.jsonld:
            try:json.loads(block)
            except (ValueError,TypeError):errors.append(f'{name}: invalid JSON-LD')
        for robots in page.meta('robots'):require('noindex' not in robots.lower(),'indexable page has noindex')
        for image in page.meta('og:image')+page.meta('twitter:image'):
            if image.startswith(ORIGIN+'/') and not local_file(image).is_file():warnings.append(f'{name}: pre-existing social image missing: {image}')
        is_portal=any(t=='body' and 'network-theme' in a.get('class','').split() for t,a in page.tags)
        if is_portal:
            portals+=1
            require(page.h1==1,'portal needs one h1')
            require(any(t=='nav' for t,a in page.tags),'navigation must be in source HTML')
            ids=[a['id'] for t,a in page.tags if 'id' in a]
            require(len(ids)==len(set(ids)),'duplicate HTML ids')
            for tag,a in page.tags:
                value=a.get('href') if tag in ('a','link') else a.get('src') if tag in ('script','img') else None
                if not value:continue
                absolute=urljoin(url,value);parsed=urlsplit(absolute)
                if parsed.netloc!='xolosarmy.xyz':continue
                target=local_file(absolute)
                require(target.is_file(),f'missing local link/asset: {value}')
                if target.is_file() and parsed.fragment and target.suffix=='.html':
                    target_page=page if target==p else Page(target.read_text())
                    require(any(at.get('id')==unquote(parsed.fragment) for ta,at in target_page.tags),f'missing anchor: {value}')
        if name.startswith('blog/') and p.name!='index.html':
            if not any(t=='a' and urlsplit(urljoin(url,a.get('href',''))).path in ('/','/blog/','/blog/index.html') for t,a in page.tags):warnings.append(f'{name}: no direct home/blog return link')
    try:
        urls=[n.text for n in ET.parse(ROOT/'sitemap.xml').findall('.//{*}loc')]
        if len(urls)!=len(set(urls)):errors.append('sitemap: duplicate URLs')
        expected={canonical(p) for p in paths}
        if set(urls)!=expected:errors.append(f'sitemap: {len(expected-set(urls))} missing, {len(set(urls)-expected)} obsolete URLs')
    except (ET.ParseError,OSError) as e:errors.append(f'sitemap: {e}')
    index=Page((ROOT/'blog/index.html').read_text())
    links={urljoin(ORIGIN+'/blog/',a.get('href','')) for tag,a in index.tags if tag=='a'}
    articles=[p for p in paths if p.parent==ROOT/'blog' and p.name!='index.html']
    for p in articles:
        if canonical(p) not in links:errors.append(f'blog directory omits {p.name}')
    if ORIGIN+'/sitemap.xml' not in (ROOT/'robots.txt').read_text():errors.append('robots.txt: missing sitemap')
    print(json.dumps({'pages':len(paths),'portal_pages':portals,'blog_articles':len(articles),'errors':errors,'warnings':list(dict.fromkeys(warnings))},ensure_ascii=False,indent=2))
    return bool(errors)
if __name__=='__main__':sys.exit(main())
