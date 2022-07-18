import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { PrepareListComponent } from './prepare-list/prepare-list.component';
import { MergeListsComponent } from './merge-lists/merge-lists.component';
import { IpmaxiApiService } from './ipmaxi-api/ipmaxi-api.service';

@NgModule({
  declarations: [
    AppComponent,
    PrepareListComponent,
    MergeListsComponent
  ],
  imports: [
    BrowserModule,    
    HttpClientModule,
    FormsModule,
    CommonModule
  ],
  providers: [
    IpmaxiApiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
