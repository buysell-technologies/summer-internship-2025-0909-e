# プロジェクトアーキテクチャ

## 1. frontend/とserver/の役割

### Server（バックエンド）
- **言語**: Go
- **フレームワーク**: Echo v4
- **役割**: 
  - REST API提供（`/v1`ベースパス）
  - ビジネスロジックの実装
  - データベース操作（PostgreSQL）
  - JWT認証によるクレーム検証
  - Swagger APIドキュメンテーション提供

### Frontend（フロントエンド）
- **言語**: TypeScript
- **フレームワーク**: React + Vite
- **役割**:
  - SPAアプリケーション
  - Material-UIによるUI実装
  - React Queryによるデータフェッチング
  - Orvalによる型安全なAPIクライアント自動生成

## 2. サーバーのhandler → usecase → repository → modelの依存関係

```
[HTTPリクエスト]
    ↓
[Handler層] (api/handler/)
    - HTTPリクエスト/レスポンスの処理
    - バリデーション
    - JWTクレームから tenant_id, store_id を取得
    - Usecaseへのデータ変換
    ↓
[Usecase層] (api/usecase/)
    - ビジネスロジックの実装
    - データの整形・検証
    - Repositoryの呼び出し
    ↓
[Repository層] (api/repository/)
    - データベースアクセスの抽象化
    - GORM使用によるORMマッピング
    - SQLクエリの実行
    ↓
[Model層] (api/domain/model/)
    - データ構造の定義
    - JSONタグ、GORMタグによるマッピング定義
```

### 例：Customer取得の流れ
1. **Handler**: `GetCustomers()` → JWTから`tenant_id`取得
2. **Usecase**: `GetCustomers()` → limitの検証（最大50000）
3. **Repository**: `GetCustomers()` → DBクエリ実行
4. **Model**: `Customer`構造体にマッピング

## 3. APIエンドポイントの使用の所在と、フロントの生成クライアントの関係

### APIエンドポイント定義
- **サーバー側**: `server/api/handler/handler.go`の`AssignRoutes()`で定義
  ```go
  /v1/customers
  /v1/stocks
  /v1/orders
  /v1/users
  ```

### クライアント生成フロー
1. **Swagger生成**: サーバーのGodocコメント → `server/docs/swagger.json`
2. **Orval実行**: `frontend/orval.config.ts`の設定に基づき
   - 入力: `../server/docs/swagger.json`
   - 出力: `frontend/src/api/generated/api.ts`
3. **型安全なフック生成**: 
   - `useGetCustomers()`, `useCreateCustomer()`等のReact Queryフック
   - 自動的に型付けされたリクエスト/レスポンス

## 4. サーバーのルート定義箇所とフロントのルート定義箇所

### サーバー側ルート
- **定義箇所**: `server/api/handler/handler.go`の`AssignRoutes()`メソッド
- **ベースパス**: `/v1`
- **主なエンドポイント**:
  ```
  GET    /v1/customers
  POST   /v1/customers
  PUT    /v1/customers/:id
  DELETE /v1/customers/:id
  
  GET    /v1/stocks
  POST   /v1/stocks
  POST   /v1/stocks/bulk
  PUT    /v1/stocks/:id
  DELETE /v1/stocks/:id
  
  GET    /v1/orders
  POST   /v1/orders
  POST   /v1/orders/bulk
  PUT    /v1/orders/:id
  
  GET    /v1/users
  POST   /v1/users
  PUT    /v1/users/:id
  DELETE /v1/users/:id
  ```

### フロント側ルート
- **定義箇所**: `frontend/src/routes/router.tsx`
- **ルーター**: TanStack Router使用
- **主なページルート**:
  ```
  /           → DashboardPage
  /customers  → CustomersPage
  /stocks     → StocksPage
  /sales      → OrdersPage
  /profile    → ProfilePage
  /login      → Login Page
  /users      → Users Page
  /orders     → Orders Page
  ```

## 5. フロントでのトークン付与方法とサーバーでのクレーム利用の流れ

### フロントエンド側（トークン付与）

#### トークン取得元（優先順位）
1. 環境変数: `VITE_API_AUTH_TOKEN`
2. LocalStorage: `authToken`

#### 付与タイミング
`frontend/src/api/apiClient.ts`でAPIリクエスト前に自動付与:
```typescript
beforeRequest: [
  (request) => {
    const envToken = import.meta.env.VITE_API_AUTH_TOKEN;
    const localToken = localStorage.getItem('authToken');
    const token = envToken || localToken;
    
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
  }
]
```

#### 認証管理
`frontend/src/hooks/useAuth.tsx`で提供:
- JWTデコードによるユーザーID取得
- ログイン/ログアウト処理
- 401エラー時の自動リダイレクト（`/login`へ）

### サーバー側（クレーム利用）

#### 認証ミドルウェア
`server/api/middleware/auth/auth.go`の`Complex()`関数:
```go
// 1. Authorizationヘッダーから Bearer トークン取得
// 2. JWTパース（署名検証はスキップ）
// 3. クレームから tenant_id, store_id 抽出
c.Set("tenant_id", tenantID)
c.Set("store_id", storeID)
```

#### ハンドラーでの利用
```go
// Echoコンテキストから取得
tenantID := c.Get("tenant_id").(string)
storeID := c.Get("store_id").(string)

// Usecaseに渡す
h.Usecase.GetCustomers(ctx, usecaseRequest.GetCustomersRequest{
    TenantID: tenantID,
    // ...
})
```

#### データアクセス制御
- **tenant_id**: マルチテナント分離
- **store_id**: 店舗ごとのデータ分離
- Repository層でこれらのIDを使ってフィルタリング

## アーキテクチャの特徴

### Clean Architecture
- 各層が明確に分離され、依存関係が一方向
- ビジネスロジックがUsecase層に集約
- インフラストラクチャ（DB）への依存がRepository層に隔離

### 型安全性
- Orvalによる自動生成でフロントエンド・バックエンド間の型整合性を保証
- Swaggerスキーマを単一の真実の源として利用

### マルチテナント対応
- JWTクレームベースのテナント分離
- すべてのデータアクセスでテナントIDによるフィルタリング

### 開発効率
- Swagger UIによるAPI確認
- 自動生成されたAPIクライアント
- React QueryによるキャッシュとAPIステート管理
