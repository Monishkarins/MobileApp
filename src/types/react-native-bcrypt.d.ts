/**
 * Type declaration for react-native-bcrypt.
 * The package ships JavaScript only, so this keeps PIN hashing screens typed.
 */

declare module 'react-native-bcrypt' {
  const bcrypt: {
    hashSync(value: string, saltOrRounds: number | string): string;
    compareSync(value: string, hash: string): boolean;
  };

  export default bcrypt;
}
