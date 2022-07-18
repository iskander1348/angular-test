import { Component, OnInit } from '@angular/core';
import * as XLSX from "xlsx"
import * as FileSaver from 'file-saver'
import { countrycodes } from '../constants/coutrycodes';
import { IpmaxiApiService } from '../ipmaxi-api/ipmaxi-api.service';

@Component({
  selector: 'app-merge-lists',
  templateUrl: './merge-lists.component.html',
  styleUrls: ['./merge-lists.component.css']
})
export class MergeListsComponent implements OnInit {

  constructor(
    private readonly ipmaxiService: IpmaxiApiService
  ){}


  ngOnInit(): void {
    this.loadSession()
  }

  userId?: number
  sessionId: string = this.ipmaxiService.generateRandomString(255)
  sessionKey?: string

  isFilesMatched: boolean = false
  isPhoneSetted: boolean = false
  isExportSetted: boolean= false

  baseFiles: Record<string, any[]> = {}
  resultFiles: Record<string, any[]> = {}
  resultFile: any[] = []
  zoominfoContacts: any[] = []
  baseFilesColumns: string[] = []
  zoominfoColumns: string[] = []
  resultFileColumns: string[] = []
  
  availibleColumns: string[] = []
  sameColumns: string[] = []
  matchedContacts: number = 0
  contactsWithoutPhone: number = 0  
  countrycodes = countrycodes
  projects: {
      id: number;
      name: string;
    }[] = []

  mergeColumn: string = 'ZoomInfo Contact ID';
  preferablePhoneNumberColumn: string = 'Preferable Phone number'
  contactNameColumn: string = "";
  websiteColumn: string = "";

  isAllowOtherCountries = false;  
  defaultCountryCode = 'US';
  phoneNumberColumns: string[] = [
    "Mobile phone",
    "Direct Phone Number",
    "Phone",
    "Custom field: MobilePhone",
    "Custom field: PhoneNumbe",
    "Custom field: Phone3",
    "Custom field: Phone4"
  ]
  filterByColumns: string[] = []
  filters: {projectId?: number, filename: string, filter: Record<string, string>}[] = []

  projectsUploadResult: {name: string, uploaded?: number, total?: number, error?: string}[] = []

  exportedColumns: {column: string, isExported: boolean}[] = []
  filteredContactCount = 0

  sendCodeToTelegram(){
    // console.log(this.userId)
    if (this.userId){
      this.sessionKey = undefined
      this.ipmaxiService.sendCode(this.userId, this.sessionId)
    }
      
  }

  getSessionKey(code: string){
    if (this.userId)
      this.ipmaxiService.exchangeCode(
        this.userId,
        this.sessionId,
        parseInt(code)
      ).subscribe(
        response => {
          if (response.success){
            this.sessionKey = response.key
            this.saveSession()
          }
            
        }
      )
  }

  getAvailibleProjects(){
    if (this.userId && this.sessionKey){
      this.ipmaxiService.getProjects(
        this.userId,
        this.sessionId,
        this.sessionKey
      ).subscribe(
        response => {
          if (response)
            this.projects = response
        }
      )
    }
  }

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

  async addBaseFiles(event: any)     
  {    
    // 
    for (const file of event.target.files){
      // console.log(file)
      const data = await this.getJsonFromFile(file)
      this.baseFiles[file.name] = data
      this.getBaseFileColumns(file.name)
      this.getSameColumns()
    }
  } 
  async addZoominfoFiles(event: any){
    for (const file of event.target.files){
      // console.log(file)
      const data = await this.getJsonFromFile(file)
      this.zoominfoContacts = [...this.zoominfoContacts, ...data]
      this.getZoominfoFileColumns()
      this.getSameColumns()
    }
  }

  getBaseFileColumns(name: string){
    if (!this.baseFiles[name])
      return;
    for (const row of this.baseFiles[name])
      for (const column of Object.keys(row)){
        if (!this.baseFilesColumns.includes(column))
          this.baseFilesColumns.push(column)
      }
  }
  getZoominfoFileColumns(){
    for (const row of this.zoominfoContacts)
      for (const column of Object.keys(row)){
        if (!this.zoominfoColumns.includes(column))
          this.zoominfoColumns.push(column)
      }
  }

  getResultfileColumns(){
    for (const row of this.resultFile)
      for (const column of Object.keys(row)){
        if (!this.resultFileColumns.includes(column)){
          this.resultFileColumns.push(column)
        }
        if (!this.exportedColumns.find(i => i.column === column))
          this.exportedColumns.push({column, isExported: true})
          
        if (!this.availibleColumns.includes(column) && !this.phoneNumberColumns.includes(column))
          this.availibleColumns.push(column)
      }

  }
  
  getSameColumns(){
    this.sameColumns = []
    for (const column of this.baseFilesColumns){
      if (this.zoominfoColumns.includes(column) && !this.sameColumns.includes(column)){
        this.sameColumns.push(column)
      }
    }
  }

  getPhoneNumberColumns(){
    for (const column of this.resultFileColumns){
      if (column.toLocaleLowerCase().match(/phone/g))
        if (!this.phoneNumberColumns.includes(column) && this.availibleColumns.includes(column)){
          this.phoneNumberColumns.push(column)
          this.availibleColumns.splice(this.availibleColumns.findIndex(i => i === column), 1)
        }
          
    }
  }

  mergeFiles(){
    this.resultFile = []
    for (const filename of Object.keys(this.baseFiles)){
      const file = this.baseFiles[filename]
      for (const record of file){
        const zoominfoContact = this.zoominfoContacts.find(i => i[this.mergeColumn] === record[this.mergeColumn])
        if (zoominfoContact){
          this.matchedContacts++;          
          this.resultFile.push({...record, ...zoominfoContact})
        }
        else{
          this.resultFile.push(record)
        }
      }      
    }
    this.getResultfileColumns()
    this.getPhoneNumberColumns()
    this.saveSettings()
    this.isFilesMatched = true
  }

  setPreferablePhoneNumber(){

    for (const record of this.resultFile){
      let preferablePhone: string | undefined
      for (const column of this.phoneNumberColumns){
        if (!preferablePhone)
          if (record[column]){
            let localPhone = this.getLocalPhone(String(record[column]))
            if (!localPhone.ISO){
              localPhone = this.getLocalPhone(`${countrycodes.find(i => i.ISO===this.defaultCountryCode)?.code}${localPhone.phone}`)
            }
            if (localPhone.ISO){
              if (this.isAllowOtherCountries || localPhone.ISO===this.defaultCountryCode){
                preferablePhone = `${localPhone.countrycode}${localPhone.phone}`
                break;
              }
            }
          }
      }
      if (preferablePhone)
        record[this.preferablePhoneNumberColumn] = preferablePhone
      else
      this.contactsWithoutPhone ++
        

    }
    this.exportedColumns.push({column:this.preferablePhoneNumberColumn, isExported: true })
    this.resultFileColumns.push(this.preferablePhoneNumberColumn)
    this.availibleColumns.push(this.preferablePhoneNumberColumn)
    this.resultFile = this.resultFile.filter(i => i[this.preferablePhoneNumberColumn])
    this.saveSettings()
    this.isPhoneSetted = true
    this.isExportSetted = true
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

  

  addPhoneNumberColumn(name: string){
    if (this.resultFileColumns.includes(name) && this.availibleColumns.includes(name)&& !this.phoneNumberColumns.includes(name)){
      
      this.phoneNumberColumns.push(name)
      this.availibleColumns.splice(this.availibleColumns.findIndex(i => i === name), 1)
    }
  }

  deletePhoneNumberColumn(name: string){
    if (this.resultFileColumns.includes(name) && !this.availibleColumns.includes(name)&& this.phoneNumberColumns.includes(name)){
      
      this.availibleColumns.push(name)
      this.phoneNumberColumns.splice(this.phoneNumberColumns.findIndex(i => i === name), 1)
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

  deleteFilter(index: number){
    this.filters.splice(index, 1)
  }

  // addCondition(filterIndex: number){
  //   this.filters[filterIndex].conditions.push(
  //     {field: "", value: ""}
  //   )
  // }

  // deleteCondition(filterIndex: number, conditionIndex: number){
  //   this.filters[filterIndex].conditions.splice(conditionIndex, 1)
  // }

  fieldValues(field: string): string[]{
    const result: string[] = []
    for (const record of this.resultFile){
      if (!record[field] && !result.includes("empty"))
        result.push("empty")
      if (record[field] && !result.includes(record[field]))
        result.push(record[field])

     

    }
    return result
  }

  exportProjects(){
    if (!this.sessionKey || !this.userId)
      return ;
    this.projectsUploadResult = []
    this.saveSettings()
    const projectIds: number[] = []
    for (const filter of this.filters){

      if (filter.projectId && !projectIds.includes(filter.projectId))
        projectIds.push(filter.projectId)
    }
    for (const projectId of projectIds){
      const filters = this.filters.filter(i => i.projectId === projectId)
      let records: any[] = []
      for (const filter of filters){
        records = [...records,
          ...this.resultFile.filter(i => {
            
            for (const condition of Object.keys(filter.filter)){
              if (i[condition] !== filter.filter[condition] && (i[condition] || filter.filter[condition]!=='empty'))
                return false
            }
            return true
          })]
      }
      // const exportedColumns = this.exportedColumns.filter(i => i.isExported)
      this.ipmaxiService.updateContacts(
        projectId,
        this.sessionId,
        this.sessionKey,
        this.userId,
        records,
        {
          phoneNumberColumn: this.preferablePhoneNumberColumn,
          nameColumn: this.contactNameColumn,
          websiteColumn: this.websiteColumn
        }
      ).subscribe( 
        response => {
          const project = this.projects.find(i => i.id == projectId)
          if (response.success){
            this.projectsUploadResult.push(
              {
                name: project?.name ?? "",
                uploaded: response.contacts.uploaded,
                total: response.contacts.total
              }
            )
          }          
          else {
            this.projectsUploadResult.push(
              {
                name: project?.name ?? "",
                error: response.error
              }
            )
          }
        }
      )

    } 
  }

  exportFiles(){
    this.saveSettings()
    const files: string[] = []
    for (const filter of this.filters){
      if (!files.includes(filter.filename))
        files.push(filter.filename)
    }
    for (const file of files){
      const filters = this.filters.filter(i => i.filename === file)
      let records: any[] = []
      for (const filter of filters){
        records = [...records,
          ...this.resultFile.filter(i => {
            
            for (const condition of Object.keys(filter.filter)){
              if (i[condition] !== filter.filter[condition] && (i[condition] || filter.filter[condition]!=='empty'))
                return false
            }
            return true
          })]
      }
      // const exportedColumns = this.exportedColumns.filter(i => i.isExported)
      let exportedRecords: any[] = []
      for (let record of records){
        const exportedRecord: Record<string, string> = {}
        for (const column of this.exportedColumns){
          if (column.isExported && record[column.column])
            exportedRecord[column.column] = record[column.column]
        }
        exportedRecords.push(exportedRecord)
      }
      // console.log(file, records.length)
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportedRecords);
      const csvOutput: string = XLSX.utils.sheet_to_csv(worksheet);
      FileSaver.saveAs(new Blob([csvOutput]), `${file}.csv`)
    }    
  }

  buildFilters(){
    this.getAvailibleProjects()
    const filters: {filename: string, filter: Record<string, string>}[] = []
    const values: Record<string, string[]> = {}
    // const columns: Record<string, number> = {}
    let filterLength = 1;
    const indexes: number[] = []
    for (const column of this.filterByColumns){
      values[column] = this.fieldValues(column)
    }
    // console.log(filterLength)
    // console.log()
    for (const column of Object.keys(values)){
      // columns[column] = values[column].length
      filterLength *= values[column].length
      indexes.push(0)
    }

    try{
      for (let f = 0; f<filterLength; f++){
        const filter: Record<string, string> = {}
        for (let i = 0; i< indexes.length; i++){
          filter[Object.keys(values)[i]] = values[Object.keys(values)[i]][indexes[i]]
        }
        filters.push({filename: "", filter})
        indexes[indexes.length - 1] += 1
        for (let j = indexes.length -1; j >= 0; j--){
          if (indexes[j] >= values[Object.keys(values)[j]].length){
            indexes[j] = 0;
            indexes[j-1] += 1;
          }
        }
      }
    }
    catch(error){
      console.log(error)
    }
  //  console.log(filters)
    this.filters = filters
    // return filters
  }

  addFilterColumn(column: string){
    if (!this.filterByColumns.includes(column))
      this.filterByColumns.push(column)
  }

  removeFilterColumn(column: string){
    const index = this.filterByColumns.findIndex(i => i===column)
    if (index > -1)
      this.filterByColumns.splice(index, 1)
  }

  saveSettings(){
   

    localStorage.setItem('mergeColumn', this.mergeColumn)
    localStorage.setItem('preferablePhoneNumberColumn', this.preferablePhoneNumberColumn)
    localStorage.setItem('isAllowOtherCountries', `${this.isAllowOtherCountries}`)
    localStorage.setItem('defaultCountryCode', this.defaultCountryCode)
    localStorage.setItem('phoneNumberColumns', this.phoneNumberColumns.toString())
    localStorage.setItem('filters', JSON.stringify(this.filters))
    localStorage.setItem('exportedColumns', JSON.stringify(this.exportedColumns))
    
    localStorage.setItem('filterByColumns', this.filterByColumns.toString())
  }

  loadSettings(){
  
    this.mergeColumn =  localStorage.getItem('mergeColumn') ?? 'ZoomInfo Contact ID';

    this.preferablePhoneNumberColumn = localStorage.getItem('preferablePhoneNumberColumn') ?? "Preferable Phone number";

    this.isAllowOtherCountries = Boolean(localStorage.getItem('isAllowOtherCountries'));

    this.defaultCountryCode = localStorage.getItem('defaultCountryCode') ?? 'US';

    this.phoneNumberColumns = localStorage.getItem('phoneNumberColumns')?.split(',') ??
        [
            "Mobile phone",
            "Direct Phone Number",
            "Phone",
            "Custom field: MobilePhone",
            "Custom field: PhoneNumbe",
            "Custom field: Phone3",
            "Custom field: Phone4"
          ];
    
    this.filters = JSON.parse(localStorage.getItem('filters') ?? '[]');

    this.exportedColumns = JSON.parse(localStorage.getItem('exportedColumns') ?? '[]')
    this.filterByColumns = localStorage.getItem('filterByColumns')?.split(',') ?? []

  }

  saveSession(){
    if (this.userId)
      localStorage.setItem('convolo-user-id', this.userId.toString())
    localStorage.setItem('session-id', this.sessionId)
    if (this.sessionKey)
      localStorage.setItem('session-key', this.sessionKey)
  }

  loadSession(){
    const userId = localStorage.getItem('convolo-user-id');
    if (userId)
      this.userId = parseInt(userId, 10)

    this.sessionId = localStorage.getItem('session-id') ?? this.sessionId

    this.sessionKey = localStorage.getItem('session-key') ?? undefined

  }

}
