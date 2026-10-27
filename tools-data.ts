import assert from 'node:assert/strict';
const isRecord=(value: unknown): value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
export function record(value: unknown): Record<string,unknown>{assert(isRecord(value),'Expected JSON object');return value;}
export function json(source: string): unknown{return JSON.parse(source);}
export function text(value: unknown): string{assert(typeof value==='string');return value;}
export function number(value: unknown): number{assert(typeof value==='number');return value;}
export function array(value: unknown): unknown[]{assert(Array.isArray(value),'Expected JSON array');return value;}
export function registry(value: unknown){return array(value).map(value=>{const r=record(value);return {id:text(r.id),name:text(r.name),page:text(r.page),defaultVersion:text(r.defaultVersion),versions:array(r.versions).map(value=>{const v=record(value);return {id:text(v.id),commit:text(v.commit)};})};});}
export function snapshot(value: unknown){const d=record(value);return {sha:text(d.sha),files:array(d.files).map(value=>{const f=record(value);return {path:text(f.path),text:f.text===null||f.text===undefined?null:text(f.text)};})};}
export function tree(value: unknown){const d=record(value),statistics=record(d.statistics);return {...d,schema:d.schema,statistics,entries:array(d.entries).map(value=>{const e=record(value);return {...e,path:text(e.path),type:text(e.type),lines:e.lines===undefined?NaN:number(e.lines)};})};}
export function manifest(value: unknown){const d=record(value);return {...d,pages:array(d.pages||[]).map(value=>{const p=record(value);return {href:text(p.href)};}),headings:array(d.headings||[]).map(value=>{const h=record(value);return {slug:text(h.slug),text:text(h.text),depth:number(h.depth)};}),anchors:Object.fromEntries(Object.entries(record(d.anchors||{})).map(([id,value])=>[id,text(value)]))};}
export interface Resource {kind: string; asset?: string; lines?: number}
export function resources(value: unknown): Record<string,Resource>{return Object.fromEntries(Object.entries(record(value)).map(([url,value])=>{const r=record(value);assert(typeof r.kind==='string');if(r.asset!==undefined)assert(typeof r.asset==='string');if(r.lines!==undefined)assert(typeof r.lines==='number');return [url,{...r,kind:r.kind,asset:r.asset,lines:r.lines}];}));}
