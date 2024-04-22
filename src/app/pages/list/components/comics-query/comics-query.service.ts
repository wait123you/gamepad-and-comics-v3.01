import { Injectable } from '@angular/core';
import { CurrentService } from '../../services/current.service';
import { ComicsSelectTypeService } from '../comics-select-type/comics-select-type.service';
declare const window: any;
@Injectable({
  providedIn: 'root'
})
export class ComicsQueryService {

  query$ = null;
  type = '';
  default_index = 0;
  list = [];
  lists = [];
  name = null;

  menu_id = null;
  constructor(
    public current: CurrentService,
    public ComicsSelectType: ComicsSelectTypeService
  ) {
    this.query$ = this.current.query().subscribe((x: any) => {
      console.log(x);

      this.menu_id = x.id
      this.type = x.query.type;
      if (x.query.type == "choice") {
        this.list = x.query.list;
        this.name = x.query.name;
        this.default_index = 0;
        this.on(this.default_index)
      }
      if (x.query.type == "multipy") {
        this.lists = x.query.list;
        this.getData();
      }
    })


  }
  async on1($event: any, e: any, index: any) {
    const node = ($event.target as HTMLElement);
    const position = node.getBoundingClientRect();
    const openTargetHeight = 36;
    const x = position.left - 10;
    const y = position.bottom + 10;
    const ic = await this.ComicsSelectType.getType(e.tag, index, { position: { top: `${y}px`, left: `${x}px` } }) as any
    this.lists[index].index = ic;
    this.getData();
  }

  getData() {
    const lists=JSON.parse(JSON.stringify(this.lists))
    let list = lists.map(x => {
      x.tag = x.tag[x.index]
      return x
    })
    window.comics_query_option = {
      page_size: window.comics_query_option.page_size,
      page_num: window.comics_query_option.page_num,
      menu_id: this.menu_id,
      list
    };
    window.comics_query();
    const node = document.querySelector("#comics_list")
    if (node) node.scrollTop = 0
  }
  on(index) {
    this.default_index = index;
    const e = this.list[index];
    window.comics_query_option = {
      page_size: window.comics_query_option.page_size,
      page_num: window.comics_query_option.page_num,
      menu_id: this.menu_id,
      ...e,
    };
    window.comics_query_option.page_num = 1;
    window.comics_query();
    const node = document.querySelector("#comics_list")
    if (node) node.scrollTop = 0
  }

  ngAfterViewInit() {

  }
}

