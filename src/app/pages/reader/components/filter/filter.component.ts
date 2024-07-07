import { Component } from '@angular/core';
import { SvgService } from 'src/app/library/svg.service';
import { FilterService } from './filter.service';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.scss'
})
export class FilterComponent {
  list = [];
  constructor(
    public svg: SvgService,
    public Filter: FilterService
  ) {

  }
  init() {
    const node: any = document.querySelector("#svg_1")
    this.svg.data.forEach((x, index) => {
      this.list.push({
        id: `filter_${index}`,
        name: x.name
      })
      this.svg.add(x.name, `filter_${index}`, node)
    })
  }
  on(index) {
    this.Filter.post({
      innerHTML: this.svg.data[index].innerHTML,
      name: this.svg.data[index].name
    }, 'page')
    this.svg.add2(this.svg.data[index].innerHTML, 'page', document.body);
    this.Filter.close();
  }
  del(){
    this.Filter.del()
    this.svg.del('page');
    this.Filter.close();

  }
  ngAfterViewInit() {
    this.init();
  }





}
