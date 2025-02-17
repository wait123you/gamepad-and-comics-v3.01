import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { firstValueFrom } from 'rxjs';
import CryptoJS from 'crypto-js'
import { MessageFetchService } from '../public-api';
@Injectable({
  providedIn: 'root'
})
export class PulgService {


  caches!: Cache;
  constructor(
    private webDb: NgxIndexedDBService,
    public MessageFetch: MessageFetchService,
    private sanitizer: DomSanitizer) {


  }
  async load() {
    const url = document.querySelector("base").href + 'assets/js/jspdf.umd.min.js'
    const url1 = document.querySelector("base").href + 'assets/js/jszip.min.js'
    const url2 = document.querySelector("base").href + 'assets/js/pptxgen.min.js'
    let list = [url, url1, url2]
    for (let index = 0; index < list.length; index++) {
      const e = list[index];
      const c = await this.MessageFetch.cacheFetch(e)
      const blob = await c.blob();
      const url: any = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      this.loadJS(url.changingThisBreaksApplicationSecurity)
    }
    await this.sleep(300)
  }
  async load2(e) {
    if ("browser-image-compression" == e || "图片压缩" == e) {
      const url2 = document.querySelector("base").href + 'assets/js/browser-image-compression.js'
      this.loadJS(url2)
    }
    await this.sleep(100)

  }
  sleep = (duration) => {
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    })
  }
  async init() {
    this.caches = await caches.open('script');
    await this.loadAllScript();
    const js = document.querySelector("base").href + 'assets/js/swiper-bundle.min.js'
    const css = document.querySelector("base").href + 'assets/css/swiper-bundle.min.css'
    await this.loadBlobJs(js)
    await this.loadBlobCss(css)
    setTimeout(() => {
      this.loadAllAssets();
    }, 100)
  }

  async loadBlobJs(js) {

    const c = await this.MessageFetch.cacheFetch(js)
    const blob = await c.blob();
    const url: any = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
    this.loadJS(url.changingThisBreaksApplicationSecurity)
  }

  async loadBlobCss(css) {
    const c = await this.MessageFetch.cacheFetch(css)
    const blob = await c.blob();
    const url: any = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
    this.loadCss(url.changingThisBreaksApplicationSecurity)
  }

  async loadAllAssets() {
    const res = await this.MessageFetch.cacheFetch(document.querySelector("base").href + 'ngsw.json')
    if (!res.ok) return
    const json = await res.json();
    for (let index = 0; index < json.assetGroups.length; index++) {
      const x = json.assetGroups[index];
      for (let f = 0; f < x.urls.length; f++) {
        const c = x.urls[f];
        await this.MessageFetch.cacheFetch(document.querySelector("base").href.slice(0, -1) + c)
      }
    }
  }

  async openFile() {
    const files = await (window as any).showOpenFilePicker()
    const blob = await files[0].getFile();
    const url = `http://localhost:7700/script/${blob.name}`;
    const response = new Response(blob);
    const request = new Request(url);
    await this.caches.put(request, response);
    const bloburl: any = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
    this.loadJS(bloburl.changingThisBreaksApplicationSecurity)
  }
  async getAll() {
    const list = await this.caches.keys()
    return list
  }
  async get(url) {
    const e = await this.caches.match(url)
    const blob = await e.blob()
    const url1: any = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
    return url1.changingThisBreaksApplicationSecurity
  }
  async delete(url) {
    const list = await this.caches.delete(url)
  }
  async registerScript(id: string, blob: any, option = {}) {
    // 'swiper-bundle.min'


  }
  async loadAllScript() {

    const list = await this.caches.matchAll()
    for (let index = 0; index < list.length; index++) {
      const e = list[index];
      const blob = await e.blob();
      const url: any = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      this.loadJS(url.changingThisBreaksApplicationSecurity)
    }

  }


  loadJS(url) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    document.body.appendChild(script);
  }
  loadCss(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url
    document.head.appendChild(link);
  }

}
