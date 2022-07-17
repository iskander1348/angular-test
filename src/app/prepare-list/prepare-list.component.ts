import { Component, OnInit } from '@angular/core';
import * as XLSX from "xlsx"
import * as FileSaver from 'file-saver'
import { countrycodes } from '../constants/coutrycodes';
// var FileSaver = require();

@Component({
  selector: 'app-prepare-list',
  templateUrl: './prepare-list.component.html',
  styleUrls: ['./prepare-list.component.css']
})
export class PrepareListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  
  title = 'convolo-xlsx-helper';

  baseFiles: Record<string, any[]> = {}
  maxLinesPerFile = 1000;
  phoneNumberSeparator = ',';
  defaultCountryCode = 'US';
  isAllowOtherCountries = false;
  phoneNumberColumns: string[] = []
  availibleColumns: string[] = []
  columns: string[] = []
  countrycodes = countrycodes

  async getJsonFromFile(file: File): Promise<any[]>
  {
    let fileReader = new FileReader(); 
    
    fileReader.readAsArrayBuffer(file);
    const result = new Promise<any[]>(
      (resolve) => {
        fileReader.onload = (event) => {    
          const data = event.target?.result; 
          let workbook = XLSX.read(data, {type:"binary"});   
          var first_sheet_name = workbook.SheetNames[0];  
          let worksheet = workbook.Sheets[first_sheet_name];  
          let arraylist = XLSX.utils.sheet_to_json(worksheet,{raw:true});   
          resolve(arraylist as any[])
        
      }    
      }
    )
    return result
  }

  async addFiles(event: any)     
  {    
    // 
    for (const file of event.target.files){
      // console.log(file)
      const data = await this.getJsonFromFile(file)
      this.baseFiles[file.name] = data
      this.getFileColumns(file.name)
      this.getPhoneNumberColumns()
    }
    
          
  
} 
  getFileColumns(name: string){
    if (!this.baseFiles[name])
      return;
    for (const row of this.baseFiles[name])
      for (const column of Object.keys(row)){
        if (!this.columns.includes(column))
          this.columns.push(column)
        if (!this.availibleColumns.includes(column) && !this.phoneNumberColumns.includes(column))
          this.availibleColumns.push(column)
      }

  }

  getPhoneNumberColumns(){
    for (const column of this.columns){
      if (column.toLocaleLowerCase().match(/phone/g))
        if (!this.phoneNumberColumns.includes(column) && this.availibleColumns.includes(column)){
          this.phoneNumberColumns.push(column)
          this.availibleColumns.splice(this.availibleColumns.findIndex(i => i === column), 1)
        }
          
    }
  }

  addPhoneNumberColumn(name: string){
    if (this.columns.includes(name) && this.availibleColumns.includes(name)&& !this.phoneNumberColumns.includes(name)){
      
      this.phoneNumberColumns.push(name)
      this.availibleColumns.splice(this.availibleColumns.findIndex(i => i === name), 1)
    }
  }

  deletePhoneNumberColumn(name: string){
    if (this.columns.includes(name) && !this.availibleColumns.includes(name)&& this.phoneNumberColumns.includes(name)){
      
      this.availibleColumns.push(name)
      this.phoneNumberColumns.splice(this.phoneNumberColumns.findIndex(i => i === name), 1)
    }   
  }

  deleteFile(name: string){
    delete this.baseFiles[name]

  }
  addElementToArray(array: unknown[], element: unknown){
    array.push(element)
  }

  moveUpInArray(array: unknown[], index: number) {
    if (index > 0) {
        const tmp = array[index - 1];
        array[index - 1] = array[index];
        array[index] = tmp;
    }
}

  moveDownInArray(array: unknown[], index: number) {
      if (index < array.length) {
          const tmp = array[index + 1];
          array[index + 1] = array[index];
          array[index] = tmp;
      }
  }

  fixPhones(){
    for (const file of Object.keys(this.baseFiles)){
      for (const record of this.baseFiles[file]){
        let phones: string[] = []
        for (const column of this.phoneNumberColumns){

            if (record[column]){
              
              phones = [...phones, ...String(record[column]).split(this.phoneNumberSeparator)];
              record[column] = ""
            }
          

          
        }
        // console.log(phones)
        let goodPhones: string[] = []
        for (const phone of phones){
          let localPhone = this.getLocalPhone(phone)
          if (!localPhone.ISO){
            localPhone = this.getLocalPhone(`${countrycodes.find(i => i.ISO===this.defaultCountryCode)?.code}${localPhone.phone}`)
          }
          if (localPhone.ISO){
            if (this.isAllowOtherCountries || localPhone.ISO===this.defaultCountryCode){
              if (!goodPhones.includes(`${localPhone.countrycode}${localPhone.phone}`))
                goodPhones.push(`${localPhone.countrycode}${localPhone.phone}`)
            }
          }
        }
        // console.log(goodPhones)
        for (const column of this.phoneNumberColumns){
          if (goodPhones.length > 0){
            record[column] = goodPhones.shift()
          }
        }
      }
    }
  }

  getLocalPhone(phone: string): { ISO: string; countrycode: string; phone: string } {
    phone = phone.replace(/\D/g, '');
    const result = { ISO: '', countrycode: '', phone };
    // ищем коды стран подходящие по длинне номера
    // и сортируем, начиная с самых длинных кодов
    const countries = countrycodes
        .filter((i) => i.length === phone.length)
        .sort((a, b) => {
            return b.code.length - a.code.length;
        });
    // ищем подходящий код страны
    // т.к. начинаем с самых длинных, ложных срабатываний быть не должно
    for (const country of countries) {
        if (phone.startsWith(country.code)) {
            (result.ISO = country.ISO), (result.countrycode = country.code);
            result.phone = phone.replace(country.code, '');
            return result;
        }
    }
    return result;
  }

  exportFile(name: string){
    if (!this.baseFiles[name])
    return ;
    const files = []
    for (let i = 0; i<this.baseFiles[name].length; i += this.maxLinesPerFile){
      files.push(this.baseFiles[name].slice(i, i+this.maxLinesPerFile))
    }
    for (let i = 0; i<files.length; i ++){
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(files[i]);
      const csvOutput: string = XLSX.utils.sheet_to_csv(worksheet);
      FileSaver.saveAs(new Blob([csvOutput]), `${name.replace(/\.(\w+)$/, "")} ${i+1}.csv`)
    }
    
  }
}
