<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api, clearTokens, hasTokens, saveTokens } from './api'

const user = ref(null)
const products = ref([])
const booting = ref(true)
const loadingProducts = ref(false)
const savingProduct = ref(false)
const pageError = ref('')
const loginError = ref('')
const productError = ref('')
const notice = ref('')
const search = ref('')
const showProductForm = ref(false)
const editingProduct = ref(null)
const loginForm = reactive({ email: '', password: '' })
const productForm = reactive({ product_name: '', description: '', price: '', quantity: '' })

const isAdmin = computed(() => user.value?.role === 'admin')
const visibleProducts = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return products.value.filter((product) => (
    !query
    || product.product_name.toLocaleLowerCase().includes(query)
    || (product.description || '').toLocaleLowerCase().includes(query)
  ))
})

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

async function loadProducts() {
  loadingProducts.value = true
  pageError.value = ''
  try {
    products.value = await api.products()
  } catch (error) {
    pageError.value = error.message
  } finally {
    loadingProducts.value = false
  }
}

async function establishSession(tokens) {
  saveTokens(tokens)
  user.value = await api.profile()
  await loadProducts()
}

async function signIn() {
  loginError.value = ''
  try {
    const tokens = await api.login(loginForm)
    await establishSession(tokens)
  } catch (error) {
    clearTokens()
    user.value = null
    loginError.value = error.message
  }
}

async function signOut() {
  const refreshToken = sessionStorage.getItem('stockroom_refresh_token')
  let revokeFailed = false
  try {
    if (refreshToken) await api.logout(refreshToken)
  } catch {
    revokeFailed = true
  } finally {
    clearTokens()
    user.value = null
    products.value = []
    notice.value = ''
    loginError.value = revokeFailed
      ? 'Signed out on this device, but the server could not confirm token revocation.'
      : ''
  }
}

function resetProductForm() {
  productForm.product_name = ''
  productForm.description = ''
  productForm.price = ''
  productForm.quantity = ''
  editingProduct.value = null
  productError.value = ''
}

function openCreateForm() {
  resetProductForm()
  showProductForm.value = true
}

function openEditForm(product) {
  resetProductForm()
  editingProduct.value = product
  productForm.product_name = product.product_name
  productForm.description = product.description || ''
  productForm.price = String(product.price)
  productForm.quantity = String(product.quantity)
  showProductForm.value = true
}

async function saveProduct() {
  productError.value = ''
  savingProduct.value = true
  const payload = {
    product_name: productForm.product_name.trim(),
    description: productForm.description.trim(),
    price: Number(productForm.price),
    quantity: Number(productForm.quantity),
  }

  try {
    if (editingProduct.value) {
      await api.updateProduct(editingProduct.value.id, payload)
      notice.value = 'Product updated.'
    } else {
      await api.createProduct(payload)
      notice.value = 'Product added.'
    }
    showProductForm.value = false
    resetProductForm()
    await loadProducts()
  } catch (error) {
    productError.value = error.message
  } finally {
    savingProduct.value = false
  }
}

async function removeProduct(product) {
  if (!window.confirm(`Delete "${product.product_name}" from your inventory?`)) return
  pageError.value = ''
  try {
    await api.deleteProduct(product.id)
    products.value = products.value.filter((item) => item.id !== product.id)
    notice.value = 'Product deleted.'
  } catch (error) {
    pageError.value = error.message
  }
}

onMounted(async () => {
  if (hasTokens()) {
    try {
      user.value = await api.profile()
      await loadProducts()
    } catch {
      clearTokens()
      user.value = null
    }
  }
  booting.value = false
})
</script>

<template>
  <main v-if="booting" class="loading-screen" aria-live="polite">
    <div class="loading-mark" aria-hidden="true">S</div>
    <p>Opening your inventory</p>
    <div class="loading-line"><span></span></div>
  </main>

  <main v-else-if="!user" class="login-layout">
    <section class="login-brand" aria-label="Stockroom">
      <a class="brand-lockup" href="/" aria-label="Stockroom home">
        <span class="brand-mark" aria-hidden="true">S</span>
        <span>stockroom</span>
      </a>
      <div class="login-intro">
        <p class="eyebrow">Product management</p>
        <h1>Your inventory,<br />in clear view.</h1>
        <p class="login-copy">Keep products, quantities, and value together in one dependable workspace.</p>
      </div>
      <div class="brand-stamp" aria-hidden="true">
        <span class="stamp-ring"></span>
        <span class="stamp-square"></span>
        <span class="stamp-line"></span>
      </div>
      <span class="brand-footnote">A calmer way to keep stock in order.</span>
    </section>

    <section class="login-panel">
      <div class="login-form-wrap">
        <div class="mobile-brand brand-lockup">
          <span class="brand-mark" aria-hidden="true">S</span>
          <span>stockroom</span>
        </div>
        <p class="eyebrow">Welcome back</p>
        <h2>Sign in to continue</h2>
        <p class="form-lede">Use your account credentials to open the inventory workspace.</p>

        <form class="login-form" @submit.prevent="signIn">
          <label for="login-email">Email address</label>
          <input
            id="login-email"
            v-model.trim="loginForm.email"
            type="email"
            autocomplete="username"
            placeholder="name@example.com"
            required
          />
          <label for="login-password">Password</label>
          <input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your password"
            required
          />
          <p v-if="loginError" class="form-error" role="alert">{{ loginError }}</p>
          <button class="button button-primary login-submit" type="submit">
            Sign in <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p class="login-note">Need access? Ask your administrator to create an account.</p>
      </div>
      <span class="login-copyright">Stockroom inventory</span>
    </section>
  </main>

  <main v-else class="app-shell">
    <section class="main-panel">
      <header class="topbar">
        <a class="brand-lockup header-brand" href="/" aria-label="Stockroom home">
          <span class="brand-mark" aria-hidden="true">S</span>
          <span>stockroom</span>
        </a>
        <div class="topbar-right">
          <span class="avatar" aria-hidden="true">{{ (user.username || user.email || 'U').slice(0, 1).toUpperCase() }}</span>
          <span class="account-meta">
            <strong>{{ user.username || user.email }}</strong>
            <small>{{ user.role }}</small>
          </span>
          <span class="role-chip">{{ user.role }}</span>
          <button class="button logout-button" type="button" @click="signOut">
            <span aria-hidden="true">↗</span>
            Log out
          </button>
        </div>
      </header>

      <div class="content-wrap">
        <div class="page-heading">
          <div>
            <p class="eyebrow">Product management</p>
            <h1>Products</h1>
            <p class="page-description">View and manage your product list.</p>
          </div>
          <button v-if="isAdmin" class="button button-primary add-button" type="button" @click="openCreateForm">
            <span class="plus-mark" aria-hidden="true">+</span>
            Add product
          </button>
        </div>

        <section id="inventory" class="inventory-section" aria-labelledby="inventory-title">
          <div class="section-heading">
            <div>
              <h2 id="inventory-title">Product list <span class="product-count">{{ products.length }}</span></h2>
              <p>Product details, prices, and quantities.</p>
            </div>
            <button class="button button-quiet refresh-button" type="button" :disabled="loadingProducts" @click="loadProducts">
              <span aria-hidden="true">↻</span> Refresh
            </button>
          </div>

          <div class="inventory-toolbar">
            <label class="search-field">
              <span class="search-icon" aria-hidden="true">⌕</span>
              <span class="sr-only">Search products</span>
              <input v-model="search" type="search" placeholder="Search products" />
            </label>
            <span class="search-count">{{ visibleProducts.length }} shown</span>
          </div>

          <p v-if="notice" class="inline-notice" role="status">
            {{ notice }}
            <button type="button" aria-label="Dismiss notification" @click="notice = ''">×</button>
          </p>
          <p v-if="pageError" class="inline-error" role="alert">{{ pageError }}</p>

          <div v-if="loadingProducts && products.length === 0" class="product-skeleton" aria-label="Loading products">
            <div v-for="line in 4" :key="line" class="skeleton-row">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
          <div v-else-if="visibleProducts.length" class="product-table-wrap">
            <table class="product-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Price</th>
                  <th scope="col">Quantity</th>
                  <th v-if="isAdmin" scope="col" class="actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(product, index) in visibleProducts" :key="product.id">
                  <td data-label="Product">
                    <div class="product-cell">
                      <span class="product-index">{{ String(index + 1).padStart(2, '0') }}</span>
                      <span class="product-details">
                        <strong>{{ product.product_name }}</strong>
                        <small>{{ product.description || 'No description' }}</small>
                      </span>
                    </div>
                  </td>
                  <td data-label="Price" class="price-cell">{{ formatCurrency(product.price) }}</td>
                  <td data-label="Quantity" class="quantity-cell"><span class="quantity-value">{{ product.quantity }}</span></td>
                  <td v-if="isAdmin" data-label="Actions" class="actions-cell">
                    <div class="row-actions">
                      <button type="button" class="text-action" @click="openEditForm(product)">Edit</button>
                      <button type="button" class="text-action text-action-danger" @click="removeProduct(product)">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">
            <span class="empty-mark" aria-hidden="true">▤</span>
            <h3>{{ search ? 'No matching products' : 'Your product list is empty' }}</h3>
            <p>{{ search ? 'Try another search term.' : 'Add a product to get started.' }}</p>
            <button v-if="isAdmin && !products.length" class="button button-primary" type="button" @click="openCreateForm">
              Add your first product
            </button>
          </div>
          <div class="table-footer">
            <span>{{ visibleProducts.length }} of {{ products.length }} products</span>
            <span v-if="!isAdmin">Read-only access</span>
          </div>
        </section>
      </div>
    </section>

    <div v-if="showProductForm" class="dialog-backdrop" @click.self="showProductForm = false">
      <section class="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
        <div class="dialog-heading">
          <div>
            <p class="eyebrow">{{ editingProduct ? 'Product details' : 'New inventory item' }}</p>
            <h2 id="product-dialog-title">{{ editingProduct ? 'Edit product' : 'Add product' }}</h2>
          </div>
          <button class="dialog-close" type="button" aria-label="Close" @click="showProductForm = false">×</button>
        </div>
        <form class="product-form" @submit.prevent="saveProduct">
          <label for="product-name">Product name</label>
          <input id="product-name" v-model="productForm.product_name" maxlength="255" required />
          <label for="product-description">Description <span class="optional-label">Optional</span></label>
          <textarea id="product-description" v-model="productForm.description" rows="3" maxlength="1000"></textarea>
          <div class="form-pair">
            <div>
              <label for="product-price">Price (PHP)</label>
              <input id="product-price" v-model="productForm.price" type="number" min="0" step="0.01" required />
            </div>
            <div>
              <label for="product-quantity">Quantity</label>
              <input id="product-quantity" v-model="productForm.quantity" type="number" min="0" step="1" required />
            </div>
          </div>
          <p v-if="productError" class="form-error" role="alert">{{ productError }}</p>
          <div class="dialog-actions">
            <button class="button button-secondary" type="button" @click="showProductForm = false">Cancel</button>
            <button class="button button-primary" type="submit" :disabled="savingProduct">
              {{ savingProduct ? 'Saving…' : editingProduct ? 'Save changes' : 'Add product' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </main>
</template>
