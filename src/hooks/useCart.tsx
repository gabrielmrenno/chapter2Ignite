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
    // busca os dados do localStorage
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      // retornando para o array de produto
       return JSON.parse(storagedCart);
    }

    //retorna vazio se localStorage for vazio
    return [];
  });

  //Deve adicionar um produto ao carrinho.
  const addProduct = async (productId: number) => {
    try {
      // copia o cart para o updaedCart -> mater imutabilidade
      const updatedCart = [...cart];
      // verificar se o produto já existe no cart
      const productExists = updatedCart.find(product => product.id === productId);

      // busca a quantidade de produto no estoque
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      // quantidade atual
      const currentAmount = productExists ? productExists.amount : 0;
      //quantidade desejada
      const amount = currentAmount + 1;

      // se valor desejado for maior que o que tem no estoque
      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // se produto existir no carrinho
      if(productExists){
        //atualiza o valor
        productExists.amount = amount;
      } else{ //senão, adiciona novo item ao cart
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct);
      }

      // atualiza cart
      setCart(updatedCart);
      // atualiza os dados no localStorage -> atenção para a conversão do dado em string
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // copia o cart para o updaedCart -> mater imutabilidade
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id === productId)

      if(productIndex >= 0){
        updatedCart.splice(productIndex,1);
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else{
        throw Error();
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      // busca a quantidade de produto no estoque
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if(productExists){
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
      
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
