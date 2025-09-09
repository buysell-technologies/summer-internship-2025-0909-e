# 在庫更新APIマイナス値バリデーション問題 調査報告書

## 🔍 問題の概要

PUT `/v1/stocks/{id}` エンドポイントにおいて、在庫の数量（quantity）と価格（price）にマイナス値を設定できてしまう問題が発生しています。

## ❌ 問題の再現結果

### テスト実行結果
```bash
# マイナス値での更新リクエスト
curl -X PUT "http://localhost:1234/v1/stocks/1" \
  -d '{
    "name": "問題のある商品",
    "quantity": -100,
    "price": -50000,
    ...
  }'

# 結果
HTTP Status: 200 OK
```

### 保存されたデータ
```json
{
  "id": 1,
  "name": "問題のある商品",
  "quantity": -100,    // ❌ マイナス値が保存されている
  "price": -50000,     // ❌ マイナス値が保存されている
  ...
}
```

## 🎯 原因の特定

### 問題のファイルと箇所

**ファイル**: `server/api/handler/request/stock.go`  
**行番号**: 27-28行目

### 問題のコード

```go
type UpdateStockRequest struct {
    StockID  string `param:"id" validate:"required,numeric,gt=0" example:"1" swaggerignore:"true"`
    Name     string `json:"name" validate:"required,min=1,max=255" example:"LOUIS VUITTON M41524 ブラウン モノグラム ハンドバッグ"`
    Quantity int    `json:"quantity" validate:"required,numeric" example:"1"`        // ❌ 問題: gte=0がない
    Price    int    `json:"price" validate:"required,numeric" example:"100000"`    // ❌ 問題: gte=0がない
    StoreID  string `json:"store_id" validate:"required,uuid4" example:"00000000-0000-0000-0000-000000000000"`
    UserID   string `json:"user_id" validate:"required,uuid4" example:"00000000-0000-0000-0000-000000000000"`
}
```

### 正しい実装（CreateStockRequest）との比較

```go
type CreateStockRequest struct {
    Name     string `json:"name" validate:"required,min=1,max=255" example:"LOUIS VUITTON M41524 ブラウン モノグラム ハンドバッグ"`
    Quantity int    `json:"quantity" validate:"required,numeric,gte=0" example:"1" minimum:"0"`    // ✅ gte=0あり
    Price    int    `json:"price" validate:"required,numeric,gte=0" example:"100000" minimum:"0"` // ✅ gte=0あり
    StoreID  string `json:"store_id" validate:"required,uuid4" example:"00000000-0000-0000-0000-000000000000"`
    UserID   string `json:"user_id" validate:"required,uuid4" example:"00000000-0000-0000-0000-000000000000"`
}
```

## 📝 原因の詳細

1. **CreateStockRequest**（12-18行目）では:
   - `Quantity`フィールド: `validate:"required,numeric,gte=0"` ✅
   - `Price`フィールド: `validate:"required,numeric,gte=0"` ✅
   - **0以上の制約が適切に設定されている**

2. **UpdateStockRequest**（24-31行目）では:
   - `Quantity`フィールド: `validate:"required,numeric"` ❌
   - `Price`フィールド: `validate:"required,numeric"` ❌
   - **`gte=0`（0以上）の制約が欠落している**

## 🔧 修正方法

`server/api/handler/request/stock.go`の27-28行目を以下のように修正する必要があります：

### 修正前
```go
Quantity int    `json:"quantity" validate:"required,numeric" example:"1"`
Price    int    `json:"price" validate:"required,numeric" example:"100000"`
```

### 修正後
```go
Quantity int    `json:"quantity" validate:"required,numeric,gte=0" example:"1" minimum:"0"`
Price    int    `json:"price" validate:"required,numeric,gte=0" example:"100000" minimum:"0"`
```

## 📍 影響範囲

- **直接影響**: PUT `/v1/stocks/{id}` エンドポイント
- **データ整合性**: マイナス在庫、マイナス価格という不正なデータが保存される
- **ビジネスロジック**: 在庫管理の基本的な制約違反

## 🚨 重要度

**高**: 在庫管理システムの基本的なデータ整合性に関わる問題であり、早急な修正が必要です。

## 📊 処理フロー

```
1. HTTPリクエスト受信（Handler層）
   ↓
2. UpdateStockRequestへバインド（27-28行目の問題箇所）
   ↓ 
3. バリデーション実行（gte=0がないため、マイナス値が通過）❌
   ↓
4. Usecase層へ渡される
   ↓
5. Repository層でDB更新
   ↓
6. マイナス値がDBに保存される❌
```

## 💡 推奨事項

1. **即座の修正**: `UpdateStockRequest`のバリデーションタグを修正
2. **他のエンドポイントの確認**: Customer、Order、UserのUpdateRequestも同様の問題がないか確認
3. **テストの追加**: マイナス値での更新が拒否されることを確認する自動テスト
4. **既存データのクリーンアップ**: 既にDBに保存されたマイナス値のデータを修正
