import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom, Observable } from "rxjs";

@Injectable()
export class IpmaxiApiService{
    
    constructor(private httpClient: HttpClient) {}

    // baseUrl = "http://localhost:4547"
    baseUrl = "https://custom.api.convolo.ai"

    generateRandomString(length: number): string{
        const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
        let key = ''
        for (let i = 0; i<length; i++){
            
            key += alphabet[Math.floor(Math.random() * (alphabet.length + 1))]
        }
        return key
    }

    sendCode(
        userId: number,
        session: string
    ):void{

        this.httpClient.post<{success: boolean}>(
                `${this.baseUrl}/api/v1/telegram-auth/get-code`, 
                {userId, session}).subscribe(response => console.log(response))        
    }

    exchangeCode(
        userId: number,
        session: string,
        code: number
    ): Observable<{
        success: true;
        key: string;
    } | {
        success: false;
    }>{
        return this.httpClient.post<{
            success: true;
            key: string;
        } | {
            success: false;
        }>(`${this.baseUrl}/api/v1/telegram-auth/exchange`, {
            userId,
            session,
            code
        })
    }

    getProjects(
        userId: number,
        session: string,
        key: string
    ): Observable<{
        id: number;
        name: string;
    }[]>{
        return this.httpClient.get<{
            id: number;
            name: string;
        }[]>(
            `${this.baseUrl}/api/v1/projects`,
             {
                params: {userId},
                headers: {
                    'session-id': session,
                    'session-key': key
                }
             })
    }

    updateContacts(
        projectId: number,
        session: string,
        key: string,
        userId: number,        
        contacts: Record<string, string>[],
        columns: {
            phoneNumberColumn: string,
            nameColumn?: string,
            websiteColumn?: string
        }
    ): Observable<{ success: true; contacts: { total: number; uploaded: number, dublicates: number } } | { success: false; error: string }>{
        return this.httpClient.put<{ success: true; contacts: { total: number; uploaded: number, dublicates: number } } | { success: false; error: string }>(
            `${this.baseUrl}/api/v1/projects/${projectId}/contacts`,
            {
                userId,
                contacts,
                columns
            },
            {
                headers: {
                    'session-id': session,
                    'session-key': key
                }
            }
        )
        //api/v1/projects/:id/contacts
    }



}