import { useMemo, useState } from 'react';
import { useGetStocks, usePostStocks, usePutStocksId, useDeleteStocksId } from '../../api/generated/api';
import StockTable from '../../features/stock/components/StockTable';
import {
  CircularProgress,
  Alert,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
} from '@mui/material';
import StockForm from '../../components/StockForm';
import StockDeleteDialog from '../../components/StockDeleteDialog';
import { useAuth, type JWTPayload } from '../../hooks/useAuth';
import { jwtDecode } from 'jwt-decode';
import type { ModelStock } from '../../api/generated/model';

const StocksPage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { mutateAsync: createStock } = usePostStocks();
  const { mutateAsync: updateStock } = usePutStocksId();
  const { mutateAsync: deleteStock } = useDeleteStocksId();
  const { token } = useAuth();

  // ダイアログ表示状態
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<ModelStock | null>(null);
  const [deletingStock, setDeletingStock] = useState<ModelStock | null>(null);

  // ローディング状態
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // メッセージ表示
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data, isLoading, error, refetch } = useGetStocks({
    limit: rowsPerPage,
    offset: page * rowsPerPage,
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const storeId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      return decoded.store_id;
    } catch {
      return null;
    }
  }, [token]);

  const userId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      return decoded.sub;
    } catch {
      return null;
    }
  }, [token]);

  // 追加ボタン押下時
  const handleAddClick = () => {
    setEditingStock(null);
    setFormOpen(true);
  };

  // 編集ボタン押下時
  const handleEditClick = (stock: ModelStock) => {
    setEditingStock(stock);
    setFormOpen(true);
  };

  // 削除ボタン押下時
  const handleDeleteClick = (stock: ModelStock) => {
    setDeletingStock(stock);
    setDeleteDialogOpen(true);
  };

  // 登録フォームのキャンセル
  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingStock(null);
  };

  // 登録フォームの保存
  const handleFormSave = async (values: { name: string; price: number; quantity: number }) => {
    if (!storeId || !userId) return;

    setFormLoading(true);

    try {
      if (editingStock) {
        // 更新
        await updateStock({
          id: editingStock.id!,
          data: {
            name: values.name,
            price: values.price,
            quantity: values.quantity,
            store_id: storeId,
            user_id: userId,
          },
        });
        setSuccessMessage('在庫情報を更新しました');
      } else {
        // 新規登録
        await createStock({
          data: {
            name: values.name,
            price: values.price,
            quantity: values.quantity,
            store_id: storeId,
            user_id: userId,
          },
        });
        setSuccessMessage('在庫を登録しました');
      }

      await refetch();
      setFormOpen(false);
      setEditingStock(null);
    } catch (_error) {
      setErrorMessage('保存に失敗しました');
      console.log(_error);
    } finally {
      setFormLoading(false);
    }
  };

  // 削除確認
  const handleDeleteConfirm = async () => {
    if (!deletingStock) return;

    setDeleteLoading(true);

    try {
      await deleteStock({ id: deletingStock.id! });
      setSuccessMessage('在庫を削除しました');
      await refetch();
      setDeleteDialogOpen(false);
      setDeletingStock(null);
    } catch (_error) {
      setErrorMessage('削除に失敗しました');
      console.log(_error);
    } finally {
      setDeleteLoading(false);
    }
  };


  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          在庫データの取得中にエラーが発生しました。
        </Alert>
        <Button variant="contained" onClick={() => refetch()}>
          再試行
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 'min-content',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#fafafa',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0,
          }}
        >
          在庫管理
          <Button variant="contained" sx={{ ml: 2 }} onClick={handleAddClick}>
            新規登録
          </Button>
        </Typography>
      </Box>
      <Box
        sx={{
          p: 3,
        }}
      >
        <StockTable
          stocks={data || []}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      </Box>

      {/* 登録・編集フォームダイアログ */}
      <Dialog open={formOpen} onClose={handleFormCancel} maxWidth="sm" fullWidth>
        <DialogTitle>{editingStock ? '在庫編集' : '在庫登録'}</DialogTitle>
        <DialogContent>
          <StockForm
            initialValues={editingStock ? {
              name: editingStock.name!,
              price: editingStock.price!,
              quantity: editingStock.quantity!,
            } : undefined}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <StockDeleteDialog
        open={deleteDialogOpen}
        stockName={deletingStock?.name || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeletingStock(null);
        }}
        loading={deleteLoading}
      />

      {/* 成功メッセージ */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* エラーメッセージ */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={3000}
        onClose={() => setErrorMessage('')}
      >
        <Alert severity="error" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StocksPage;
