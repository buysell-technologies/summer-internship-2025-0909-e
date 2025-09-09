package repository

import (
	"context"

	"github.com/buysell-technologies/summer-internship-2024-backend/api/domain/model"
	"gorm.io/gorm/clause"
)

func (r *repository) GetUsers(ctx context.Context, tenantID string, limit, offset int) ([]*model.User, error) {
	users := []*model.User{}

	if err := r.db.Unscoped().
		Preload("Stocks"). // Preloadで一括取得（N+1問題を解決）
		Joins("LEFT JOIN stores AS s ON users.store_id = s.id").
		Where("s.tenant_id = ?", tenantID).
		Limit(limit).
		Offset(offset).
		Find(&users).
		Error; err != nil {
		return nil, err
	}

	// 【変更前のN+1問題があったコード】
	// for i := range users {
	//     stocks := []*model.Stock{}
	//     if err := r.db.Where("user_id = ?", users[i].ID).Find(&stocks).Error; err != nil {
	//         return nil, err
	//     }
	//     users[i].Stocks = stocks
	// }

	// 【変更後】
	// Preloadが自動的に各ユーザーのStocksを設定してくれるため、
	// ループでの個別取得は不要

	return users, nil
}

func (r *repository) GetUser(ctx context.Context, tenantID, userID string) (*model.User, error) {
	user := &model.User{}

	if err := r.db.Unscoped().
		Preload("Stocks"). // Preloadで一括取得（N+1問題を解決）
		Joins("LEFT JOIN stores AS s ON users.store_id = s.id").
		Where("s.tenant_id = ? AND users.id = ?", tenantID, userID).
		First(&user).
		Error; err != nil {
		return nil, err
	}

	// 【変更前のN+1問題があったコード】
	// stocks := []*model.Stock{}
	// if err := r.db.Where("user_id = ?", user.ID).Find(&stocks).Error; err != nil {
	//     return nil, err
	// }
	// user.Stocks = stocks

	// 【変更後】
	// Preloadが自動的にuser.Stocksを設定してくれるため、
	// 個別取得は不要

	return user, nil
}

func (r *repository) CreateUser(ctx context.Context, user model.User) (*string, error) {
	if err := r.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user.ID, nil
}

func (r *repository) UpdateUser(ctx context.Context, user model.User) (*model.User, error) {
	if err := r.db.Model(&user).
		Unscoped().
		Clauses(clause.Returning{}).
		Where("id = ?", user.ID).
		Updates(&user).
		Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *repository) DeleteUser(ctx context.Context, tenantID, userID string) error {
	if err := r.db.
		Where(
			"users.id = ? AND users.store_id IN (?)",
			userID,
			r.db.Model(&model.Store{}).
				Select("id").
				Where("tenant_id = ?", tenantID),
		).
		Delete(&model.User{}).
		Error; err != nil {
		return err
	}

	return nil
}
