import { Component, ElementRef, HostListener, Input, NgZone, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, ParamMap, NavigationEnd, NavigationStart } from '@angular/router';
import { map, throttleTime, Subject, firstValueFrom } from 'rxjs';
import { AppDataService, ContextMenuEventService, DbControllerService, DbEventService, HistoryService, KeyboardEventService, LocalCachService, WebFileService } from 'src/app/library/public-api';

import { CurrentService } from '../../services/current.service';
import { DataService } from '../../services/data.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { ComicsListV2Service } from './comics-list-v2.service';
import { ComicsSelectTypeService } from '../comics-select-type/comics-select-type.service';
import { DownloadOptionService } from '../download-option/download-option.service';
import { DropDownMenuService } from '../drop-down-menu/drop-down-menu.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-comics-list-v2',
  templateUrl: './comics-list-v2.component.html',
  styleUrl: './comics-list-v2.component.scss'
})
export class ComicsListV2Component {
  key: string = '';

  is_all = false;
  selected_length = 0;

  @ViewChild('listbox') ListNode: ElementRef;
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key == "z" || this._ctrl) {
      return false
    }
    if (event.key == "Meta") this._ctrl = true;
    if (event.key == "Control") this._ctrl = true;

    return true
  }
  // selectedAll
  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {

    if (event.key == "Meta") this._ctrl = false;
    if (event.key == "Control") this._ctrl = false;
    return true
  }
  _ctrl = false;
  page_num = 1;
  page_size = 20;
  list = [];


  query = {
    id: "",
    default_index: 0,
    list: [],
    name: ""
  }
  query_option = {};
  source = '';
  menu_id = '';

  id = null;
  type = null;



  is_destroy = false;
  constructor(
    public data: DataService,
    public current: CurrentService,
    public ContextMenuEvent: ContextMenuEventService,
    public router: Router,
    public WebFile: WebFileService,
    private zone: NgZone,
    public route: ActivatedRoute,
    public DbController: DbControllerService,
    public webDb: NgxIndexedDBService,
    public DbEvent: DbEventService,
    public ComicsListV2: ComicsListV2Service,
    public KeyboardEvent: KeyboardEventService,
    public ComicsSelectType: ComicsSelectTypeService,
    public history: HistoryService,
    private _snackBar: MatSnackBar,
    public DownloadOption: DownloadOptionService,
    public App: AppDataService,
    public DropDownMenu: DropDownMenuService,
    public LocalCach: LocalCachService
  ) {
    KeyboardEvent.registerGlobalEventY({
      "a": () => {
        this.all()

      }
    })
    this.router.events.subscribe(event => {

      if (event instanceof NavigationStart) {

      }

    })

    let id$ = this.route.paramMap.pipe(map((params: ParamMap) => params));
    id$.subscribe(async (params) => {
      if (this.id) await this.put()
      const type = params.get('id')
      let source = params.get('sid')
      const sid = params.get('pid')
      if (!source) source = type;
      this.source = source;
      this.type = type;
      this.App.setsource(source)
      if (type == "history") {
        this.id = `${type}_${source}`;
        this.key = this.id;

        ComicsListV2.register({
          id: this.id,
          type: type,
          page_size: 20
        }, {
          Add: async (obj) => {
            return (await this.history.getAll() as any).sort((a, b) => b.last_read_date - a.last_read_date).filter(x => x.source == source).slice((obj.page_num - 1) * obj.page_size, (obj.page_num) * obj.page_size);
          },
          Init: async (obj) => {
            return (await this.history.getAll() as any).sort((a, b) => b.last_read_date - a.last_read_date).filter(x => x.source == source).slice((obj.page_num - 1) * obj.page_size, obj.page_size);
          }
        })

      } else if (type == "local_cache") {
        this.id = `local_cache`;
        this.key = this.id;
        ComicsListV2.register({
          id: this.id,
          type: type,
          page_size: 20
        }, {
          Add: async (obj) => {
            const res = await firstValueFrom(this.webDb.getAll("local_comics"))
            const list = res.map((x: any) => {
              x = x.data
              return { id: x.id, cover: x.cover, title: x.title,creation_time:x.creation_time, subTitle: `${x.chapters[0].title}` }
            }).sort((a, b) => b.creation_time - a.creation_time).slice((obj.page_num - 1) * obj.page_size, obj.page_size * obj.page_num);
            return list
          },
          Init: async (obj) => {
            const res = await firstValueFrom(this.webDb.getAll("local_comics"))
            const list = res.map((x: any) => {
              x = x.data


              return { id: x.id, cover: x.cover, title: x.title,creation_time:x.creation_time, subTitle: `${x.chapters[0].title}` }
            }).sort((a, b) => b.creation_time - a.creation_time).slice((obj.page_num - 1) * obj.page_size, obj.page_size * obj.page_num);
            console.log(list);

            return list
          }
        })
      } else if (type == "temporary_file") {
        this.id = `${sid}`;
        this.key = this.id;
        ComicsListV2.register({
          id: this.id,
          type: type,
          page_size: 20
        }, {
          Add: async (obj) => {
            const list = await this.DbController.getList({ temporary_file_id: this.id, ...obj }, { source: 'temporary_file', is_cache: false });
            return list
          },
          Init: async (obj) => {
            const list = await this.DbController.getList({ temporary_file_id: this.id, ...obj }, { source: 'temporary_file', is_cache: false });
            return list
          }
        })
      } else if (sid) {
        this.menu_id = sid;
        this.source = source;
        const obj = this.DbEvent.Configs[source].menu.find(x => x.id == sid);
        this.id = `${type}_${source}_${sid}`;
        if (obj.query.list) this.query.list = obj.query.list;


        if (obj.query.name) this.query.name = obj.query.name;
        else this.query.name = ''
        this.key = this.id;
        this.App.setsource(this.source);
        const e: any = this.query.list[this.query.default_index];
        this.query_option = {
          menu_id: this.menu_id,
          ...e,
        }
        ComicsListV2.register({
          id: this.id,
          type: type,
          page_size: obj.query.page_size
        }, {
          Add: async (obj) => {
            const list = await this.DbController.getList({ ...this.query_option, ...obj }, { source: this.source });
            return list
          },
          Init: async (obj) => {
            const list = await this.DbController.getList({ ...this.query_option, ...obj }, { source: this.source });
            return list
          }
        })

      }

      const data: any = await this.get(this.id);
      if (data) {
        console.log(this.type,this.id );

        data.list.forEach(x => {
          x.selected = false;
        })
        this.page_num = data.page_num;
        if (this.type == "multipy") {
          this.query.list = data.query.list;
          this.getDatac123123();
          this.list = data.list;
        } else if (this.type == "choice") {
          this.query.default_index = data.query.default_index;
          this.list = data.list;
        } else if (this.type == "history") {

          this.list = await this.ComicsListV2.Events[this.id].Init({ page_num: 1, page_size: data.list.length });

        } else if (this.type == "local_cache") {

          this.list = await this.ComicsListV2.Events[this.id].Init({ page_num: 1, page_size: 1000});
        } else {
          this.list = data.list;
        }
        if (this.list.length == 0) {
          this.page_num = 0;
        }

        this.zone.run(() => {
          setTimeout(async () => {
            await this.overflow()
            this.ListNode.nativeElement.scrollTop = data.scrollTop;
          })
        })

      } else {

        if (this.type == "multipy") {
          this.getDatac123123();
          this.init();
        } else if (this.type == "choice") {
          this.init();
        } else {
          this.init();
        }

      }

    })

    ContextMenuEvent.register('comics_item', {
      on: async (e: any) => {
        const index = this.list.findIndex(x => x.id.toString() == e.value.toString());
        if (this.list.filter(x => x.selected).length == 0) {
          this.list[index].selected = !this.list[index].selected;
        }
        const list = this.getSelectedData();
        e.click(list)
      }
    })
  }

  initc(type, source, menu_id) {
    if (type == "choice") {

    }
  }
  closeEdit() {
    this.data.is_edit = false;
    this.list.forEach(x => {
      x.selected = false
    })
  }
  getSelectedData() {
    const list = this.list.filter(x => x.selected)
    return list
  }
  download() {
    const list = this.getSelectedData();
    this.DownloadOption.open(list)
  }
  async DropDownMenuOpen() {
    const e = await this.DropDownMenu.open([      {
      name: "数据", id: "data", submenu: [
        {
          name: "重置阅读进度", id: "reset_reading_progress", click: async (list) => {

            for (let index = 0; index < list.length; index++) {
              await this.resetReadingProgress(list[index].id)
              this._snackBar.open(`${list[index].title}`, '重置阅读进度已完成', { duration: 1000 })
            }

          }
        },
        {
          name: "重置数据", id: "reset_data", click: async (list) => {
            for (let index = 0; index < list.length; index++) {
              this.DbController.delWebDbDetail(list[index].id)
              const res = await this.DbController.getDetail(list[index].id)
              for (let index = 0; index < res.chapters.length; index++) {
                const chapter_id = res.chapters[index].id;
                await this.DbController.delWebDbPages(chapter_id)
                const pages = await this.DbController.getPages(chapter_id)
                for (let index = 0; index < pages.length; index++) {
                  await this.DbController.delWebDbImage(pages[index].src)
                }
              }
              this._snackBar.open(`${list[index].title}`, '重置数据已完成', { duration: 1000 })
            }
          }
        },
        {
          name: "提前加载", id: "load", click: async (list) => {
            for (let index = 0; index < list.length; index++) {
              const res = await this.DbController.getDetail(list[index].id)
              for (let index = 0; index < res.chapters.length; index++) {
                const chapter_id = res.chapters[index].id;
                const pages = await this.DbController.getPages(chapter_id)
                for (let index2 = 0; index2 < pages.length; index2++) {
                  await this.DbController.getImage(pages[index2].src)
                  this._snackBar.open(`${res.chapters[index].title} 第${index2 + 1}页/${pages.length}页`, '提前加载完成')
                }
                this._snackBar.open(`${res.chapters[index].title}`, '提前加载完成')
              }
              this._snackBar.open(`${list[index].title}`, '提前加载已完成', { duration: 1000 })
            }
          }
        },
        {
          name: "重新获取", id: "reset_get", click: async (list) => {
            for (let index = 0; index < list.length; index++) {
              this.DbController.delWebDbDetail(list[index].id)
              const res = await this.DbController.getDetail(list[index].id)
              for (let index = 0; index < res.chapters.length; index++) {
                const chapter_id = res.chapters[index].id;
                await this.DbController.delWebDbPages(chapter_id)
                const pages = await this.DbController.getPages(chapter_id)
              }
              this._snackBar.open(`${list[index].title}`, '重新获取已完成', { duration: 1000 })
            }
          }
        },
      ]
    }])
    if (e) {
      const list = this.getSelectedData();
      (e as any).click(list)
    }


  }
  async resetReadingProgress(comics_id) {
    const detail = await this.DbController.getDetail(comics_id)
    for (let index = 0; index < detail.chapters.length; index++) {
      const x = detail.chapters[index];
      firstValueFrom(this.webDb.update("last_read_chapter_page", { 'chapter_id': x.id.toString(), "page_index": 0 }))
      if (index == 0) firstValueFrom(this.webDb.update("last_read_comics", { 'comics_id': comics_id.toString(), chapter_id: detail.chapters[index].id }))
    }
  }

  async delCaches(comics_id) {
    await firstValueFrom(this.webDb.deleteByKey('history', comics_id.toString()))
    await firstValueFrom(this.webDb.deleteByKey('local_comics', comics_id))
    await firstValueFrom(this.webDb.deleteByKey('local_comics', comics_id.toString()))
    this.DbController.delComicsAllImages(comics_id)
  }
  async cache() {
    const list = this.getSelectedData();
    for (let index = 0; index < list.length; index++) {
      await this.LocalCach.save(list[index].id);
    }
  }

  async all() {
    const c = this.list.filter(x => x.selected == true).length

    if (c == this.list.length) {
      this.list.forEach(x => {
        x.selected = false
      })
    } else {
      this.list.forEach(x => {
        x.selected = true
      })
    }
    this.getIsAll();
  }

  async getIsAll() {
    const c = this.list.filter(x => x.selected == true).length
    this.selected_length = c;

    if (c == this.list.length) {
      this.is_all = true;
    } else {
      this.is_all = false;
    }


  }
  async on_list($event: MouseEvent) {

    const node = $event.target as HTMLElement;
    if (node.getAttribute("id") == 'comics_list') {
      this.list.forEach(x => x.selected = false)
    } else {
      const getTargetNode = (node: HTMLElement): HTMLElement => {
        if (node.getAttribute("region") == "comics_item") {
          return node
        } else {
          return getTargetNode(node.parentNode as HTMLElement)
        }
      }

      const target_node = getTargetNode(node);
      const index = parseInt(target_node.getAttribute("index") as string);
      const data = this.list[index]
      if (this.data.is_edit || this._ctrl) {
        this.list[index].selected = !this.list[index].selected;
      } else {
        localStorage.setItem('list_url', window.location.href)
        const nodec: any = $event.target;
        if (this.data.config.click_type == 1) {
          this.current.routerDetail(this.source, data.id)
        } else if (this.data.config.click_type == 2) {

          this.current.routerReader(this.source, data.id)
        }
        else if (this.data.config.click_type == 3) {
          if (nodec.getAttribute("router_reader")) {
            this.current.routerReader(this.source, data.id)
          } else {
            this.current.routerDetail(this.source, data.id)
          }
        }
        else if (this.data.config.click_type == 2) {
          if (nodec.getAttribute("router_reader")) {

            this.current.routerDetail(this.source, data.id)
          } else {
            this.current.routerReader(this.source, data.id)
          }
        } else {
          this.current.routerDetail(this.source, data.id)
        }

      }

    }
    this.getIsAll();
  }

  async on(index) {
    this.query.default_index = index;
    const e = this.query.list[index];
    this.query_option = {
      menu_id: this.menu_id,
      ...e,
    }
    this.page_num = 1;
    this.ListNode.nativeElement.scrollTop = 0;
    this.list = await this.ComicsListV2.init(this.key, { page_num: this.page_num });
  }

  async on2($event: any, e: any, index: any) {
    const node = ($event.target as HTMLElement);
    const position = node.getBoundingClientRect();
    const openTargetHeight = 36;
    const x = position.left - 10;
    const y = position.bottom + 10;
    const ic = await this.ComicsSelectType.getType(e.tag, index, { position: { top: `${y}px`, left: `${x}px` } }) as any
    this.query.list[index].index = ic;
    this.getDatac123123();
    this.list = await this.ComicsListV2.init(this.key, { page_num: this.page_num });
  }

  getDatac123123() {
    const lists = JSON.parse(JSON.stringify(this.query.list))
    let list = lists.map(x => {
      x.tag = x.tag[x.index]
      return x
    })
    this.query_option = {
      menu_id: this.menu_id,
      list
    };
  }

  async put() {
    // if(this.type=="history") return null
    let obj = {
      id: this.id,
      query: this.query,
      list: this.list,
      page_num: this.page_num,
      scrollTop: this.ListNode.nativeElement.scrollTop
    }

    return this.ComicsListV2._data[this.id] = obj
  }

  async get(id) {
    const res = this.ComicsListV2._data[id];
    if (res) {
      return res
    } else {
      return null
    }
  }


  ngAfterViewInit() {
    this.ListNode.nativeElement.addEventListener('scroll', (e: any) => {
      this.scroll$.next(e)
    }, true)
    this.scroll$.pipe(throttleTime(300)).subscribe(e => {
      this.handleScroll(e);
    })

  }

  async init() {
    this.page_num = 1;
    if (this.ListNode) this.ListNode.nativeElement.scrollTop = 0;
    this.list = await this.ComicsListV2.init(this.key, { page_num: this.page_num });
    this.overflow()
  }
  async overflow() {
    if (this.list.length == 0) {
      await this.add_pages();
      return
    }

    const node = this.ListNode.nativeElement.querySelector(`[index='${this.list.length - 1}']`)

    if (node && this.ListNode.nativeElement.clientHeight < node.getBoundingClientRect().y) {

    } else {
      const length = this.list.length;
      await this.add_pages();
      if (this.list.length == length) {

      } else {
        this.overflow();
      }

    }
  }
  scroll$ = new Subject();
  async handleScroll(e: any) {
    const node: any = this.ListNode.nativeElement;
    let scrollHeight = Math.max(node.scrollHeight, node.scrollHeight);
    let scrollTop = e.target.scrollTop;
    let clientHeight = node.innerHeight || Math.min(node.clientHeight, node.clientHeight);
    if (clientHeight + scrollTop + 300 >= scrollHeight) {
      await this.add_pages();
    }
  }
  ngOnDestroy() {
    this.put();
    this.is_destroy = true;
    this.scroll$.unsubscribe();
  }
  is_end = false;
  async add_pages() {
    if (this.is_destroy) return
    this.page_num++;
    const list = await this.ComicsListV2.add(this.key, { page_num: this.page_num, page_size: this.page_size })
    if (list.length == 0) {
      this.page_num--;
      return
    }
    this.list =  [...this.list, ...list].filter((item, index, self) =>
      index === self.findIndex((t) => (
          t.id === item.id
      ))
  );

  }
}
