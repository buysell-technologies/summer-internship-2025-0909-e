# SQLインジェクション脆弱性 調査報告書

## 🚨 問題の確認

### 再現結果

**SQLインジェクションが成功してしまいました！**

入力値:
```
name: "test' || (SELECT version()) || '"
```

結果:
```
name: "testPostgreSQL 13.22 (Debian 13.22-1.pgdg13+1) on aarch64-unknown-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit"
```

PostgreSQLのバージョン情報が実行され、データベースに保存されてしまっています。

## 🎯 原因の特定

### 問題のファイルと箇所

**ファイル**: `server/api/repository/stock.go`  
**行番号**: 60-69行目（UpdateStock関数）

### 問題のコード

```go
func (r *repository) UpdateStock(ctx context.Context, stock model.Stock) (*model.Stock, error) {
    // ❌ 危険: 文字列連結でSQL文を組み立てている
    updateQuery := fmt.Sprintf("name = '%s', quantity = %d, price = %d", stock.Name, stock.Quantity, stock.Price)
    
    if err := r.db.
        Exec("UPDATE stocks SET "+updateQuery+" WHERE id = ?", stock.ID).  // ❌ 部分的にしかパラメータ化されていない
        Error; err != nil {
        return nil, err
    }
    
    return &stock, nil
}
```

### 問題点の詳細

1. **文字列連結によるSQL構築**: `fmt.Sprintf`で直接SQL文を組み立てている
2. **部分的なパラメータ化**: WHERE句の`id`はパラメータ化されているが、SET句は文字列連結
3. **エスケープ処理なし**: ユーザー入力がそのままSQL文に埋め込まれる

## 🔧 修正方法の検討

### 方法1: GORMのUpdate機能を使用（推奨）
```go
// ✅ 安全: GORMが自動的にパラメータ化
if err := r.db.Model(&model.Stock{}).
    Where("id = ?", stock.ID).
    Updates(map[string]interface{}{
        "name": stock.Name,
        "quantity": stock.Quantity,
        "price": stock.Price,
    }).Error; err != nil {
    return nil, err
}
```

**メリット**:
- GORMが自動的にSQLインジェクション対策を行う
- コードがシンプルで読みやすい
- 他のGORM機能と一貫性がある

### 方法2: パラメータ化クエリを使用
```go
// ✅ 安全: 完全にパラメータ化されたクエリ
if err := r.db.
    Exec("UPDATE stocks SET name = ?, quantity = ?, price = ? WHERE id = ?", 
        stock.Name, stock.Quantity, stock.Price, stock.ID).
    Error; err != nil {
    return nil, err
}
```

**メリット**:
- 直接的なSQL制御が可能
- パフォーマンスの最適化が可能

### 方法3: Prepared Statementを使用
```go
// ✅ 安全: Prepared Statementによる実行
stmt := r.db.Raw("UPDATE stocks SET name = ?, quantity = ?, price = ? WHERE id = ?", 
    stock.Name, stock.Quantity, stock.Price, stock.ID)
if err := stmt.Error; err != nil {
    return nil, err
}
```

**メリット**:
- 複数回実行する場合に効率的
- SQLインジェクション対策が確実

## 📊 他の関数の確認

同じファイル内の他の関数を確認：

| 関数名 | 行番号 | 安全性 | 理由 |
|--------|--------|--------|------|
| GetStocks | 10-23 | ✅ 安全 | パラメータ化されている |
| GetStock | 25-36 | ✅ 安全 | パラメータ化されている |
| CreateStock | 38-44 | ✅ 安全 | GORMのCreateメソッド使用 |
| CreateBulkStock | 46-58 | ✅ 安全 | GORMのCreateInBatchesメソッド使用 |
| UpdateStock | 60-70 | ❌ 脆弱 | 文字列連結でSQL構築 |
| DeleteStock | 72-80 | ✅ 安全 | パラメータ化されている |

## 💡 推奨される修正

**方法1（GORMのUpdate機能）**を推奨します。理由：
1. 既存のコードベースとの一貫性
2. GORMの機能を最大限活用
3. 保守性が高い
4. 自動的にSQLインジェクション対策が適用される
