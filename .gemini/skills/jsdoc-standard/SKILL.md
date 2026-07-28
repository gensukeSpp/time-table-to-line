---
name: jsdoc-standard
description: このスキルは、関数が作成または修正された際に、JSDoc形式の標準的なコメントを付与するための手順を定義します。
---

# JSDoc Standard Skill

## 目的
すべての関数に一貫した形式で引数（@params）と戻り値（@return）の型および説明を記述し、コードの可読性とメンテナンス性を向上させる。

## 実行タイミング（AIの判断基準）
- 新しい関数を定義したとき
- 既存の関数を大幅に修正したとき
- ユーザーから「ドキュメントを整備して」と依頼されたとき

## 指順（Instructions）
1. 関数が定義された直上の行に JSDoc コメントブロック `/** ... */` を作成する。
2. 各引数に対して以下の形式で記述する：
   - `@params`
      `引数名 :型 - 簡単な説明`
3. 戻り値に対して以下の形式で記述する：
   - `@return :型 戻り値の説明`
4. 説明文は簡潔かつ明瞭な日本語で記述する。

## 例
Input:
function add(a, b) { return a + b; }

Output:
/**
 * 二つの数値を加算します。
 * @params
 *  a :number - 加算する最初の数値
 *  b :number - 加算する二番目の数値
 * @return :number 加算された合計値
 */
function add(a, b) { return a + b; }