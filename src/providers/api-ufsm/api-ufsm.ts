import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, HostListener } from '@angular/core';
import { Trabalho } from '../../interfaces/trabalho';
import { Avaliacao, Estado } from '../../interfaces/avaliacao';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { LocalDataProvider } from '../local-data/local-data';

/*
  Generated class for the ApiUfsmProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class ApiUfsmProvider {

  //private trabalhos: Array<Trabalho>;
  private readonly url: string;
  private readonly headers: HttpHeaders;
  private trabalhosObs: BehaviorSubject<Array<Trabalho>>;
  private avaliacoesPendentes: Array<Avaliacao>;

  constructor(public http: HttpClient, public localDataProvider: LocalDataProvider) {
    console.log('Hello ApiUfsmProvider Provider');
    this.url = "https://raw.githubusercontent.com/Felipe-Marin/pwa-jai-ufsm/master/api.json";
    let token = "";
    let deviceID = "";
    this.headers = new HttpHeaders({
      'X-UFSM-Access-Token': token,
      'X-UFSM-Device-ID': deviceID
    });
    this.trabalhosObs = new BehaviorSubject([]);
    this.avaliacoesPendentes = new Array<Avaliacao>();
  }

  ngOnInit(){
    this.localDataProvider.getAvaliacoesPendentes().then(avaliacoesPendentes => {
      this.avaliacoesPendentes = avaliacoesPendentes;
      if(navigator.onLine){
        this.sendAvaliacoes();
      }
    });
    
  }

  public getTrabalhos(){
    this.http.get(this.url).subscribe((response: JsonResponse) => {
      if(!response.error){
        this.trabalhosObs.next(response.trabalhos);
        this.localDataProvider.setTrabalhos(response.trabalhos)
          .then(()=>console.log("OK"))
          .catch(console.error);
      }else{
        this.getTrabalhosLocal();
      }
    }, err => {
      console.log(err);
      this.getTrabalhosLocal();
    });
    return this.trabalhosObs;
  }

  private getTrabalhosLocal(){
    this.localDataProvider.getTrabalhos().then(trabalhos => {
      this.trabalhosObs.next(trabalhos);
    });
  }

  public setAvaliacao(avaliacao: Avaliacao){
    let sendAvaliacao = new Promise((resolve, reject) => {
      if(navigator.onLine){
        avaliacao.estado = Estado.Enviado;
        this.localDataProvider.setAvaliacao(avaliacao.trabalho, avaliacao).then(()=>{
          resolve();
        });
      }else{
        avaliacao.estado = Estado.NaoEnviado;
        this.avaliacoesPendentes.push(avaliacao);
        this.localDataProvider.setAvaliacao(avaliacao.trabalho, avaliacao).then(()=>{
          reject();
        });
      }
    });
    return sendAvaliacao;
  }

  @HostListener('document:online')
  private sendAvaliacoes(){
    for(let i = 0; i < this.avaliacoesPendentes.length; i++){
      this.setAvaliacao(this.avaliacoesPendentes[i]).then(() => {
        this.avaliacoesPendentes.splice(i, 1);
      });
    }
  }

}

interface JsonResponse{
  id: number,
  error: boolean,
  codigo: number,
  mensagem: string,
  trabalhos: Array<Trabalho>,
  errorEntity: boolean
}
