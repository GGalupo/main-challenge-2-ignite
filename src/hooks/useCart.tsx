import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {    
      const newCart = [...cart]
      
      const productExists = newCart.find(product => product.id === productId)

      const productStock = await api.get<Stock>(`/stock/${productId}`)
        .then(response => response.data.amount)

      const currentAmount = productExists ? productExists.amount : 0
      const newAmount = currentAmount + 1

      if (productStock < newAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      
      if (productExists) {
        productExists.amount = newAmount
      } else {
        const newProduct = await api.get(`/products/${productId}`)
          .then(response => response.data)

        const newProductFormatted = {
          ...newProduct,
          amount: 1
        }

        newCart.push(newProductFormatted)
      }

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.findIndex(product => product.id === productId)

      if (productExists >= 0) {
        const newCart = cart.filter(product => product.id !== productId)
  
        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        throw new Error()
      }

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const productStock = await api.get<Stock>(`/stock/${productId}`)
        .then(response => response.data.amount)

      if (amount > productStock) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      
      const newCart = [...cart]
      const productExists = newCart.find(product => product.id === productId)

      if (productExists) {
        productExists.amount = amount
      } else {
        throw new Error()
      }

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
