import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Box,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { Asset } from '../types/index';
import type { Currency, AssetType } from '../types';

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (asset: Partial<Asset>) => Promise<void>;
  initialData?: Asset;
}

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'ARS', label: 'Peso Argentino (ARS)' },
];

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'CRYPTO', label: 'Criptomoneda' },
  { value: 'STOCK', label: 'Acción' },
  { value: 'FOREX', label: 'Divisa' },
];

export default function AssetForm({ open, onClose, onSubmit, initialData }: AssetFormProps) {
  const [formData, setFormData] = useState<Partial<Asset>>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Asset, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Validar el formulario
  const validateForm = () => {
    const newErrors: Partial<Record<keyof Asset, string>> = {};

    if (!formData.symbol?.trim()) {
      newErrors.symbol = 'El símbolo es requerido';
    }

    if (!formData.type) {
      newErrors.type = 'El tipo de activo es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTextChange = (field: keyof Asset) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Limpiar el error del campo cuando se modifica
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error updating asset:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          Editar Activo
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Nombre"
            fullWidth
            value={formData.name}
            disabled
            helperText="El nombre no puede ser modificado"
          />

          <FormControl fullWidth margin="dense" error={!!errors.type}>
            <InputLabel>Tipo de Activo</InputLabel>
            <Select
              value={formData.type || ''}
              label="Tipo de Activo"
              onChange={(e: SelectChangeEvent) => {
                setFormData(prev => ({ ...prev, type: e.target.value as AssetType }));
                if (errors.type) {
                  setErrors(prev => ({ ...prev, type: undefined }));
                }
              }}
              disabled={!!initialData}
            >
              {ASSET_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
            {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
          </FormControl>

          <TextField
            margin="dense"
            label="Símbolo"
            fullWidth
            required
            value={formData.symbol}
            onChange={handleTextChange('symbol')}
            error={!!errors.symbol}
            helperText={errors.symbol || "Ej: BTC para Bitcoin, AAPL para Apple"}
          />

          <TextField
            margin="dense"
            label="Unidades Totales"
            type="number"
            fullWidth
            value={formData.totalUnits}
            disabled
            helperText="Las unidades se actualizan automáticamente con las transacciones"
          />

          <TextField
            margin="dense"
            label="Precio Promedio de Compra"
            type="number"
            fullWidth
            value={formData.averagePurchasePrice}
            disabled
            helperText="El precio promedio se actualiza automáticamente con las transacciones"
          />

          <FormControl fullWidth margin="dense">
            <InputLabel>Moneda</InputLabel>
            <Select
              value={formData.currency}
              label="Moneda"
              disabled
            >
              {CURRENCIES.map(currency => (
                <MenuItem key={currency.value} value={currency.value}>
                  {currency.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>La moneda no puede ser modificada</FormHelperText>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 