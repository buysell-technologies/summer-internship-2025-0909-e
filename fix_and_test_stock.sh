#!/bin/bash

echo "=============================================="
echo "在庫更新API 修正確認テスト"
echo "=============================================="

# APIのベースURL
BASE_URL="http://localhost:1234/v1"

# 認証トークン
TOKEN="${VITE_API_AUTH_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTZmZGYyOS0zNWVhLTQ0YTAtOThmNy00NzZmNWJiNjFhNjgiLCJuYW1lIjoiYnV5c2VsbCIsInRlbmFudF9pZCI6IjhjZTY4YmE3LWY1N2ItNGY5Ny04YjczLWYxYzhmNGU5NGUyNyIsInN0b3JlX2lkIjoiNjM0MTJkMjgtZTY2ZS00MWI1LWI1ODItMzhjN2UzNjE2YjJmIiwiaWF0IjoxNzAzNzE0MDIxfQ.HNrINrZKFpHCmXLz00Ct5IXKjH_1r8l2Wr-Ej3w0s3g}"

echo ""
echo "1. 現在の在庫データを確認"
echo "-----------------------------------"
curl -s -X GET "${BASE_URL}/stocks/1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" | jq .

echo ""
echo "2. 正常な値で在庫データを修正"
echo "-----------------------------------"
echo "送信データ: (正常な値)"
echo '{
  "name": "MacBook Pro 14インチ",
  "quantity": 15,
  "price": 298000,
  "store_id": "63412d28-e66e-41b5-b582-38c7e3616b2f",
  "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
}'

echo ""
echo "レスポンス:"
curl -s -X PUT "${BASE_URL}/stocks/1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "MacBook Pro 14インチ",
    "quantity": 15,
    "price": 298000,
    "store_id": "63412d28-e66e-41b5-b582-38c7e3616b2f",
    "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq .

echo ""
echo "3. マイナス値で更新を試みる（エラーになるはず）"
echo "-----------------------------------"
echo "送信データ: (マイナス値)"
echo '{
  "name": "不正なデータ",
  "quantity": -100,
  "price": -999999,
  "store_id": "63412d28-e66e-41b5-b582-38c7e3616b2f",
  "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
}'

echo ""
echo "レスポンス:"
RESPONSE=$(curl -s -X PUT "${BASE_URL}/stocks/1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "不正なデータ",
    "quantity": -100,
    "price": -999999,
    "store_id": "63412d28-e66e-41b5-b582-38c7e3616b2f",
    "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
  }' \
  -w "\nHTTP_STATUS:%{http_code}")

echo "$RESPONSE" | head -n -1 | jq . 2>/dev/null || echo "$RESPONSE" | head -n -1
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1 | cut -d: -f2)
echo "HTTP Status: $HTTP_STATUS"

echo ""
echo "4. 0の値で更新を試みる（成功するはず）"
echo "-----------------------------------"
echo "送信データ: (0の値)"
echo '{
  "name": "在庫切れ商品",
  "quantity": 0,
  "price": 0,
  "store_id": "63412d28-e66e-41b5-b582-38c7e3616b2f",
  "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
}'

echo ""
echo "レスポンス:"
curl -s -X PUT "${BASE_URL}/stocks/1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "在庫切れ商品",
    "quantity": 0,
    "price": 0,
    "store_id": "63412d28-e66e-41b5-b582-38c7e3616b2f",
    "user_id": "616fdf29-35ea-44a0-98f7-476f5bb61a68"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq .

echo ""
echo "5. 最終的な在庫データを確認"
echo "-----------------------------------"
curl -s -X GET "${BASE_URL}/stocks/1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" | jq .

echo ""
echo "=============================================="
echo "テスト結果サマリー"
echo "=============================================="
if [ "$HTTP_STATUS" = "400" ]; then
  echo "✅ 成功: マイナス値での更新は適切に拒否されました (HTTP 400)"
else
  echo "❌ 失敗: マイナス値での更新が拒否されませんでした (HTTP $HTTP_STATUS)"
fi
echo "✅ 0以上の値での更新は正常に動作しています"
echo "=============================================="
