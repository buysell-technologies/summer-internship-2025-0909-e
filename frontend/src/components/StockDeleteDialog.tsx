import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';

interface StockDeleteDialogProps {
  open: boolean;
  stockName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const StockDeleteDialog: React.FC<StockDeleteDialogProps> = ({
  open,
  stockName,
  onConfirm,
  onCancel,
  loading,
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>在庫の削除確認</DialogTitle>
      <DialogContent>
        <Typography>「{stockName}」を削除してもよろしいですか？</Typography>
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          この操作は取り消すことができません。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          キャンセル
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? '削除中...' : '削除'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockDeleteDialog;
