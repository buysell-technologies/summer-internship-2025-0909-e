import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    TextField,
    DialogActions,
    Alert,
    CircularProgress,
} from '@mui/material';

interface StockFormProps {
    initialValues?: {
        name: string;
        price: number;
        quantity: number;
    };
    onSave: (values: { name: string; price: number; quantity: number }) => Promise<void>;
    onCancel: () => void;
    loading: boolean;
}

const StockForm: React.FC<StockFormProps> = ({
    initialValues,
    onSave,
    onCancel,
    loading,
}) => {
    const [values, setValues] = useState({
        name: initialValues?.name || '',
        price: initialValues?.price?.toString() || '',
        quantity: initialValues?.quantity?.toString() || '',
    });

    useEffect(() => {
        setValues({
            name: initialValues?.name || '',
            price: initialValues?.price?.toString() || '',
            quantity: initialValues?.quantity?.toString() || '',
        });
    }, [initialValues]);

    const [errors, setErrors] = useState<{
        name?: string;
        price?: string;
        quantity?: string;
    }>({});

    const [submitError, setSubmitError] = useState<string>('');

    const validate = () => {
        const newErrors: typeof errors = {};

        if (!values.name || values.name.trim().length === 0) {
            newErrors.name = '商品名は必須です';
        } else if (values.name.length > 100) {
            newErrors.name = '商品名は100文字以内で入力してください';
        }

        const priceNum = Number(values.price);
        if (!values.price || values.price.trim().length === 0) {
            newErrors.price = '価格は必須です';
        } else if (isNaN(priceNum)) {
            newErrors.price = '価格は数値で入力してください';
        } else if (priceNum < 0) {
            newErrors.price = '価格は0円以上で入力してください';
        }

        const quantityNum = Number(values.quantity);
        if (!values.quantity || values.quantity.trim().length === 0) {
            newErrors.quantity = '在庫数は必須です';
        } else if (isNaN(quantityNum)) {
            newErrors.quantity = '在庫数は数値で入力してください';
        } else if (quantityNum < 0) {
            newErrors.quantity = '在庫数は0個以上で入力してください';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        setSubmitError('');

        try {
            await onSave({
                name: values.name,
                price: Number(values.price),
                quantity: Number(values.quantity),
            });
        } catch (_error) {
            setSubmitError('保存中にエラーが発生しました');
            console.log(_error);
        }
    };

    return (
        <Box sx={{ pt: 2 }}>
            {submitError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {submitError}
                </Alert>
            )}

            <TextField
                fullWidth
                label="商品名"
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
                sx={{ mb: 2 }}
                required
                disabled={loading}
            />

            <TextField
                fullWidth
                label="価格"
                value={values.price}
                onChange={(e) => setValues({ ...values, price: e.target.value })}
                error={!!errors.price}
                helperText={errors.price}
                InputProps={{
                    endAdornment: '円',
                }}
                sx={{ mb: 2 }}
                required
                disabled={loading}
            />

            <TextField
                fullWidth
                label="在庫数"
                value={values.quantity}
                onChange={(e) => setValues({ ...values, quantity: e.target.value })}
                error={!!errors.quantity}
                helperText={errors.quantity}
                InputProps={{
                    endAdornment: '個',
                }}
                sx={{ mb: 2 }}
                required
                disabled={loading}
            />

            <DialogActions>
                <Button onClick={onCancel} disabled={loading}>
                    キャンセル
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    startIcon={loading && <CircularProgress size={20} />}
                >
                    {loading ? '保存中...' : '保存'}
                </Button>
            </DialogActions>
        </Box>
    );
};

export default StockForm;
