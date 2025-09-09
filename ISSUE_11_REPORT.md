# Issue #11: 在庫更新APIのマイナス値バリデーション問題の修正

## 問題の概要

### As Is
PUT `/v1/stocks/{id}` において、在庫の数量（quantity）と価格（price）の値をマイナスでリクエストした場合、データが更新できてしまう。

### To Be
PUT `/v1/stocks/{id}` において、在庫の数量と価格の値をマイナスでリクエストした場合、データは更新できない。

## 問題の原因

`server/api/handler/request/stock.go` の `UpdateStockRequest` 構造体において、`Quantity` と `Price` フィールドのバリデーションが不適切でした。

### 修正前のコード
```go
type UpdateStockRequest struct {
    StockID  string `param:"id" validate:"required,numeric,gt=0" example:"1" swaggerignore:"true"`
    Name     string `json:"name" validate:"required,min=1,max=255" example:"LOUIS VUITTON M41524 ブラウン モノグラム ハンドバッグ"`
    Quantity int    `json:"quantity" validate:"required,numeric" example:"1"`
    Price    int    `json:"price" validate:"required,numeric" example:"100000"`
    StoreID  string `json:"store_id" validate:"required,uuid4" example:"00000000-0000-0000-0000-000000000000"`
    UserID   string `json:"user_id" validate:"required,uuid4" example:"00000000-0000-0000-0000-000000000000"`
}
```

`Quantity` と `Price` に `gte=0`（0以上）の制約がなかったため、マイナス値が受け入れられていました。

## 修正内容

### 修正後のコード
```go
type UpdateStockRequest struct {
    StockID  string `param:"id" validate:"required,numeric,gt=0" example:"1" swaggerignore:"true"`
    Name     string `json:"name" validate:"required,min=1,max=255" example:"LOUIS VUITTON M41524 ブラウン モノグラム ハンドバッグ"`
    Quantity int    `json:"quantity" validate:"required,numeric,gte=0" example:"1" minimum:"0"`
    Price    int    `json:"price" validate:"required,numeric,gte=0" example:"100000" minimum:"0"`
    StoreID  string `json:"store_id" validate:"required,uuid4" example:"00000000-0000-0000-0000-000000000000"`
    UserID   string `json:"user_id" validate:"required,uuid4" example:"00000000-0000-0000-0000-000000000000"`
}
```

以下の変更を行いました：
- `Quantity`: `validate:"required,numeric,gte=0"` - 0以上の制約を追加
- `Price`: `validate:"required,numeric,gte=0"` - 0以上の制約を追加
- Swagger用に `minimum:"0"` タグも追加

## テスト結果

### 1. マイナス値での更新テスト

**リクエスト:**
```json
{
  "name": "不正なデータ",
  "quantity": -100,
  "price": -999999,
  "store_id": "63412d28-e66e-41b5-b582-38c7e3616b2f",
  "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
}
```

**レスポンス:**
- HTTPステータス: `400 Bad Request`
- エラーメッセージ:
```json
{
  "message": "Key: 'UpdateStockRequest.Quantity' Error:Field validation for 'Quantity' failed on the 'gte' tag\nKey: 'UpdateStockRequest.Price' Error:Field validation for 'Price' failed on the 'gte' tag"
}
```

✅ **期待通りの動作**: マイナス値での更新は適切に拒否されました。

### 2. 正常な値での更新テスト

**リクエスト:**
```json
{
  "name": "MacBook Pro 14インチ",
  "quantity": 15,
  "price": 298000,
  "store_id": "63412d28-e66e-41b5-b582-38c7e3616b2f",
  "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
}
```

**レスポンス:**
- HTTPステータス: `200 OK`
- データは正常に更新されました

✅ **期待通りの動作**: 正常な値での更新は成功しました。

## 修正ファイル

- `server/api/handler/request/stock.go` - `UpdateStockRequest` 構造体のバリデーション修正

## 追加の考慮事項

1. **CreateStockRequest との一貫性**: `CreateStockRequest` 構造体では既に `gte=0` の制約があったため、今回の修正により、作成と更新の両方で一貫したバリデーションが適用されるようになりました。

2. **0の値の扱い**: 現在の実装では、数量0や価格0は有効な値として受け入れられます。これはビジネス要件に応じて適切かもしれません（例：在庫切れ商品、無料商品など）。

3. **他のエンティティの確認**: 同様の問題が他のエンティティ（Customer、Order、User）の更新APIにも存在する可能性があるため、確認が必要です。

## まとめ

PUT `/v1/stocks/{id}` エンドポイントにおいて、マイナス値での在庫更新を防ぐバリデーションを追加しました。この修正により、データの整合性が保たれ、不正な値での更新が防止されます。
