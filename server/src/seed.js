const Book = require('./models/Book');

const SAMPLE_BOOKS = [
  { title: 'Cien años de soledad', author: 'Gabriel García Márquez', isbn: '978-0307474728', category: 'Ficción', price: 12.99, stock: 25, coverUrl: 'https://picsum.photos/seed/cien/300/420', available: true },
  { title: 'El principito', author: 'Antoine de Saint-Exupéry', isbn: '978-0156012195', category: 'Ficción', price: 8.50, stock: 40, coverUrl: 'https://picsum.photos/seed/principito/300/420', available: true },
  { title: 'Sapiens: De animales a dioses', author: 'Yuval Noah Harari', isbn: '978-0062316097', category: 'Historia', price: 14.99, stock: 18, coverUrl: 'https://picsum.photos/seed/sapiens/300/420', available: true },
  { title: 'Homo Deus', author: 'Yuval Noah Harari', isbn: '978-0062464316', category: 'Historia', price: 13.99, stock: 15, coverUrl: 'https://picsum.photos/seed/homodeus/300/420', available: true },
  { title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0132350884', category: 'Tecnología', price: 29.99, stock: 12, coverUrl: 'https://picsum.photos/seed/cleancode/300/420', available: true },
  { title: 'The Pragmatic Programmer', author: 'Andrew Hunt, David Thomas', isbn: '978-0135957059', category: 'Tecnología', price: 34.99, stock: 8, coverUrl: 'https://picsum.photos/seed/pragmatic/300/420', available: true },
  { title: 'Atomic Habits', author: 'James Clear', isbn: '978-0735211292', category: 'Negocios', price: 11.99, stock: 30, coverUrl: 'https://picsum.photos/seed/atomichabits/300/420', available: true },
  { title: 'El arte de la guerra', author: 'Sun Tzu', isbn: '978-1590302255', category: 'Negocios', price: 6.99, stock: 50, coverUrl: 'https://picsum.photos/seed/arteguerra/300/420', available: true },
  { title: 'Breves respuestas a las grandes preguntas', author: 'Stephen Hawking', isbn: '978-1984819192', category: 'Ciencia', price: 15.50, stock: 10, coverUrl: 'https://picsum.photos/seed/hawking/300/420', available: true },
  { title: 'Cosmos', author: 'Carl Sagan', isbn: '978-0345539434', category: 'Ciencia', price: 16.99, stock: 14, coverUrl: 'https://picsum.photos/seed/cosmos/300/420', available: true },
  { title: '1984', author: 'George Orwell', isbn: '978-0451524935', category: 'Ficción', price: 9.99, stock: 22, coverUrl: 'https://picsum.photos/seed/1984/300/420', available: true },
  { title: 'Fahrenheit 451', author: 'Ray Bradbury', isbn: '978-1451673319', category: 'Ficción', price: 10.50, stock: 20, coverUrl: 'https://picsum.photos/seed/f451/300/420', available: true },
];

async function seed() {
  const count = await Book.countDocuments();
  if (count > 0) {
    console.log(`Seed omitido: ya existen ${count} libros.`);
    return;
  }
  await Book.insertMany(SAMPLE_BOOKS);
  console.log(`Seed: ${SAMPLE_BOOKS.length} libros insertados.`);
}

module.exports = { seed };