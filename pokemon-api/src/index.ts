// Jiali Sheng

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

const app = new Hono()
type Pokemon = {
  id: number
  name: string
  species: string
  health: number
  level: number
  owner: string
}
type User = {
  username: string
  password: string
  creationDate: Date
}

const users: User[] = []

const pokemon: Pokemon[] = [
  {
    id: 1,
    name: 'Pikachu',
    species: 'Pikachu',
    health: 100,
    level: 5,
    owner: 'Ash'
  }
]

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/user/register', async (c) => {
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof body !== 'object' || body == null || Array.isArray(body)) {
    return c.json({ error: 'Body must be a JSON object' }, 400)
  }

  const { username, password } = body as Record<string, unknown>

  if (typeof username !== 'string' || !username.trim()) {
    return c.json({ error: 'Username is required' }, 400)
  }
  if (typeof password !== 'string' || !password.trim()) {
    return c.json({ error: 'Password is required' }, 400)
  }

  if (users.some((u) => u.username === username)) {
    return c.json({ error: 'Username already exists' }, 409)
  }

  const newUser: User = {
    username,
    password,
    creationDate: new Date()
  }

  users.push(newUser)
  setCookie(c, 'username', username, {
    path: '/',
    httpOnly: true
  })

  return c.json({ message: 'Registration is successful' }, 201)

})

app.post('/user/login', async (c) => {
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof body !== 'object' || body == null || Array.isArray(body)) {
    return c.json({ error: 'Body must be a JSON object' }, 400)
  }

  const { username, password } = body as Record<string, unknown>

  const foundUser = users.find(
    (u) => u.username === username && u.password === password
  )

  if (!foundUser) {
    return c.json({ error: 'Invalid username or password' }, 401)
  }

  setCookie(c, 'username', foundUser.username, {
    path: '/',
    httpOnly: true
  })

  return c.json({ message: 'Login successful' }, 200)
})

app.post('/user/logout', (c) => {
  deleteCookie(c, 'username', { path: '/' })

  return c.json({ message: 'Logout successful' }, 200)
})

app.get('/api/pokemon', (c) => {
  const username = getCookie(c, 'username')

  if (!username || !users.some((u) => u.username === username)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const ownedPokemon = pokemon.filter(
    (p) => p.owner === username
  )

  return c.json(ownedPokemon, 200)
})

app.post('/api/pokemon', async (c) => {
  const username = getCookie(c, 'username')

  if (!username || !users.some((u) => u.username === username)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return c.json({ error: 'Body must be a JSON object' }, 400)
  }

  const { name, species, health, level } = body as Record<string, unknown>
  if ('id' in body) {
    return c.json({ error: 'ID must not be provided' }, 400)
  }

  if (typeof species !== 'string' || !species.trim()) {
    return c.json({ error: 'Species is required' }, 400)
  }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return c.json({ error: 'Name must be a non-empty string' }, 400)
  }

  if (health !== undefined && (typeof health !== 'number' || !Number.isFinite(health))) {
    return c.json({ error: 'Health must be a number' }, 400)
  }

  if (level !== undefined && (typeof level !== 'number' || !Number.isFinite(level))) {
    return c.json({ error: 'Level must be a number' }, 400)
  }

  let newId: number
  do {
    newId = Math.floor(Math.random() * 1000000) + 1
  } while (pokemon.some((p) => p.id === newId))
  const newPokemon: Pokemon = {
    id: newId,
    name: name === undefined ? species : name as string,
    species,
    health: Math.floor(Math.random() * 100) + 1,
    level: Math.floor(Math.random() * 100) + 1,
    owner: username
  }

  pokemon.push(newPokemon)
  return c.json(newPokemon, 201)
})

app.delete('/api/pokemon/:id', (c) => {
  const username = getCookie(c, 'username')

  if (!username || !users.some((u) => u.username === username)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const id = Number(c.req.param('id'))

  if (!Number.isSafeInteger(id) || id <= 0) {
    return c.json({ error: 'Invalid Pokemon ID' }, 400)
  }

  const index = pokemon.findIndex((p) => p.id === id)

  if (index === -1) {
    return c.json({ error: 'Pokemon not found' }, 404)
  }

  if (pokemon[index].owner !== username) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const deletedPokemon = pokemon.splice(index, 1)[0]
  return c.json(deletedPokemon, 200)
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
