#!/bin/bash

echo "==========================================="
echo "在庫更新API マイナス値バリデーションテスト"
echo "==========================================="

# APIのベースURL
BASE_URL="http://localhost:1234/v1"

# 認証トークン (環境変数から取得またはデフォルト値を使用)
TOKEN="${VITE_API_AUTH_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTZmZGYyOS0zNWVhLTQ0YTAtOThmNy00NzZmNWJiNjFhNjgiLCJuYW1lIjoiYnV5c2VsbCIsInRlbmFudF9pZCI6IjhjZTY4YmE3LWY1N2ItNGY5Ny04YjczLWYxYzhmNGU5NGUyNyIsInN0b3JlX2lkIjoiNjM0MTJkMjgtZTY2ZS00MWI1LWI1ODItMzhjN2UzNjE2YjJmIiwiaWF0IjoxNzAzNzE0MDIxfQ.HNrINrZKFpHCmXLz00Ct5IXKjH_1r8l2Wr-Ej3w0s3g}"

echo ""
echo "1. 既存の在庫データを取得 (ID: 1)"
echo "-----------------------------------"
curl -X GET "${BASE_URL}/stocks/1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" | jq .

echo ""
echo "2. マイナス値で在庫を更新しようとする"
echo "-----------------------------------"
echo "送信データ:"
echo '{
  "name": "テスト商品",
  "quantity": -10,
  "price": -50000,
  "store_id": "634186-e66e-41b5-b582-38c7e3616b2f",
  "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
}'

echo ""
echo "レスポンス:"
curl -X PUT "${BASE_URL}/stocks/1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "テスト商品",
    "quantity": -10,
    "price": -50000,
    "store_id": "63412d28-e66e-41b5-b582-38c7e3616b2f",
    "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq .

echo ""
echo "3. 更新後の在庫データを確認"
echo "-----------------------------------"
curl -X GET "${BASE_URL}/stocks/1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" | jq .

echo ""
echo "==========================================="
echo "テスト完了"
echo "==========================================="
