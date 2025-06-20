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
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { Asset, Currency, AssetType } from '../types';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

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

// Helper para comparar asset type de forma robusta
const isCryptoType = (type: string | undefined) => (type || '').toUpperCase() === 'CRYPTO';

export default function AssetForm({ open, onClose, onSubmit, initialData }: AssetFormProps) {
  const [formData, setFormData] = useState<Partial<Asset>>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Asset, string>>>({});
  const [cryptoList, setCryptoList] = useState<{ id: string; symbol: string; name: string }[]>([]);
  const [cryptoLoading, setCryptoLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Descargar lista de criptos de CoinGecko si es necesario
  useEffect(() => {
    if (isCryptoType(formData.type) && cryptoList.length === 0 && open) {
      setCryptoLoading(true);
      fetch('https://api.coingecko.com/api/v3/coins/list')
        .then(res => res.json())
        .then(data => setCryptoList(data))
        .catch(() => setCryptoList([]))
        .finally(() => setCryptoLoading(false));
    }
  }, [formData.type, open]);

  // Validar el formulario
  const validateForm = () => {
    const newErrors: Partial<Record<keyof Asset, string>> = {};

    if (!formData.type) {
      newErrors.type = 'El tipo de activo es requerido';
    }

    if (isCryptoType(formData.type)) {
      // Para cripto, symbol debe ser un id válido de CoinGecko
      if (!formData.symbol || !cryptoList.some(c => c.id === formData.symbol)) {
        newErrors.symbol = 'Debes seleccionar una criptomoneda válida de la lista.';
      }
    } else {
      if (!formData.symbol?.trim()) {
        newErrors.symbol = 'El símbolo es requerido';
      }
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
                setFormData(prev => ({ ...prev, type: (e.target.value as string).toUpperCase() as AssetType, symbol: '' }));
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

          {/* Autocompletado solo para CRYPTO */}
          {isCryptoType(formData.type) ? (
            <Autocomplete
              options={cryptoList}
              loading={cryptoLoading}
              filterOptions={(options, { inputValue }) => {
                const input = inputValue.trim().toLowerCase();
                if (input.length < 2) return [];
                // Priorizar coincidencia exacta de símbolo
                const exactSymbol = options.find(option => option.symbol.toLowerCase() === input);
                let filtered = options.filter(option =>
                  option.name.toLowerCase().startsWith(input) ||
                  option.symbol.toLowerCase().startsWith(input)
                );
                if (exactSymbol) {
                  filtered = [exactSymbol, ...filtered.filter(o => o.id !== exactSymbol.id)];
                }
                return filtered.slice(0, 20);
              }}
              getOptionLabel={option => `${option.name} (${option.symbol.toUpperCase()})`}
              value={cryptoList.find(c => c.id === formData.symbol) || null}
              onChange={(_e, value) => {
                setFormData(prev => ({ ...prev, symbol: value ? value.id : '' }));
                if (errors.symbol) {
                  setErrors(prev => ({ ...prev, symbol: undefined }));
                }
              }}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Criptomoneda"
                  margin="dense"
                  required
                  error={!!errors.symbol}
                  helperText={
                    errors.symbol
                      ? errors.symbol
                      : typeof params.inputProps.value === 'string' && params.inputProps.value.length < 2
                        ? 'Escribe al menos 2 letras para buscar.'
                        : 'Busca y selecciona la criptomoneda. El símbolo se autocompleta.'
                  }
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {cryptoLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
          ) : (
            <TextField
              margin="dense"
              label="Símbolo"
              fullWidth
              required
              value={formData.symbol}
              onChange={handleTextChange('symbol')}
              error={!!errors.symbol}
              helperText={errors.symbol || "Ej: AAPL para Apple"}
            />
          )}

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