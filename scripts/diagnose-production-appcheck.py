#!/usr/bin/env python3
"""Read-only production Vite asset audit. Never print user credentials or tokens."""
import urllib.request
import urllib.parse
import re
expected_site_key="6LcpY-EtAAAAAElqBbIL_K7nAkm2wpuF6fbhsggG"
expected_app="1:555464791734:web:6f916a69f26e74b9767817"
for origin in ("https://nestaffiliate.millionsnest.com/", "https://mn-nestaffiliate-555464791734.web.app/"):
    try:
        def load(url):
            req=urllib.request.Request(url,headers={"User-Agent":"NestAffiliate-Production-Audit","Cache-Control":"no-cache"})
            with urllib.request.urlopen(req,timeout=18) as rsp:
                return rsp.read().decode("utf-8","replace")
        html=load(origin)
        entry=re.findall(r'<script[^>]+src=["\x27]([^"\x27]+\.js[^"\x27]*)["\x27]',html,re.I)
        preload=re.findall(r'<link[^>]+href=["\x27]([^"\x27]+\.js[^"\x27]*)["\x27]',html,re.I)
        queue=[urllib.parse.urljoin(origin,p) for p in (entry+preload)]
        blobs=[]
        seen=set()
        while queue and len(seen)<55:
            url=queue.pop(0)
            if url in seen or urllib.parse.urlsplit(url).hostname!=urllib.parse.urlsplit(origin).hostname:continue
            seen.add(url)
            body=load(url)
            blobs.append(body)
            for imported in re.findall(r'["\x27]([^"\x27]+\.js)["\x27]',body):
                if imported.startswith("./") or imported.startswith("/assets/"):
                    candidate=urllib.parse.urljoin(url,imported)
                    if candidate not in seen and candidate not in queue:queue.append(candidate)
        js="\n".join(blobs)
        keys=set(re.findall(r"6L[A-Za-z0-9_-]{25,100}",js))
        apps=set(re.findall(r"1:555464791734:web:[A-Za-z0-9]+",js))
        print("HOST",urllib.parse.urlsplit(origin).hostname)
        print("ENTRY_FILES",len(entry),"TOTAL_JS",len(blobs))
        print("EXPECTED_RECAPTCHA_KEY_PRESENT",expected_site_key in keys)
        print("OTHER_RECAPTCHA_KEY_COUNT",len(keys-{expected_site_key}))
        print("EXPECTED_FIREBASE_WEB_APP_PRESENT",expected_app in apps)
        print("OTHER_FIREBASE_APP_COUNT",len(apps-{expected_app}))
        print("EARLY_APPCHECK_CODE_IN_LIVE_BUNDLE","APP_CHECK_NOT_INITIALIZED" in js)
        print("SDK_ERROR_TOKEN_GUARD_IN_LIVE_BUNDLE","INITIAL_THROTTLE" in js and "RECAPTCHA_ERROR" in js)
        print("LIVE_E2E_PLACEHOLDER_FLAG","e2e-app-check-token" in js)
    except Exception as exc:
        print("PROBE_FAILED",urllib.parse.urlsplit(origin).hostname,type(exc).__name__,str(exc)[:130])
