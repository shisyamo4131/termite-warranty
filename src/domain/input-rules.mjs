// Vuetify-compatible synchronous field rules; server validation remains authoritative.
const text = value => String(value ?? '').trim()
export const requiredRule = value => !!text(value) || '入力・選択してください。'
export const lengthRule = value => text(value).length <= 2000 || '2000文字以内で入力してください。'
export const postalRule = value => !text(value) || /^\d{7}$/.test(text(value).replace(/[-\s]/g,'')) || '郵便番号は7桁で入力してください。'
export const phoneRule = value => !text(value) || /^[0-9-]+$/.test(text(value)) || '半角数字とハイフンで入力してください。'
export const emailRule = value => !text(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value)) || 'メールアドレスの形式を確認してください。'
export const prefixRule = value => /^[A-Z0-9-]*$/.test(text(value)) || '半角英大文字・数字・ハイフンで入力してください。'
export const areaRule = value => !text(value) || Number.isFinite(Number(value)) && Number(value)>0 && Math.abs(Number(value)*100-Math.round(Number(value)*100))<=0.000001 || '正の数・小数2桁までで入力してください。'
export const dateRule = value => {if(!text(value))return true;const d=new Date(text(value)+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(text(value)) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===text(value) || '実在する日付を入力してください。'}
export const monthRule = value => !text(value) || /^\d{4}-(0[1-9]|1[0-2])$/.test(text(value)) || '年月を確認してください。'
export const yearRule = value => !text(value) || /^\d{4}$/.test(text(value)) || '年度は西暦4桁で入力してください。'
export const requiredRules = [requiredRule,lengthRule]
export const optionalRules = [lengthRule]
