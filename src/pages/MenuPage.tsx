import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  confirmMenuBatch,
  getMenuBatch,
  getMenuList,
  updateMenuItems,
  uploadMenuImages,
  type MenuBatch,
  type MenuBatchStatus,
  type MenuCategory,
  type MenuList,
} from '../features/store/api/menuApi'
import { AppShell } from '../shared/ui/AppShell'
import './menu-page.css'

type FormItem = {
  id: number
  order: number
  name: string
  price: string
  category: MenuCategory | ''
  priceReviewRequired: boolean
}

const categories: { value: MenuCategory; label: string }[] = [
  { value: 'COFFEE', label: '커피' },
  { value: 'TEA', label: '티' },
  { value: 'BEVERAGE', label: '음료' },
  { value: 'CAKE', label: '케이크' },
  { value: 'BAKERY', label: '베이커리' },
  { value: 'OTHER', label: '기타' },
]

const previewList: MenuList = {
  menuRevision: 3,
  items: [
    {
      id: 21,
      order: 1,
      name: '아메리카노',
      price: 4500,
      category: 'COFFEE',
      updatedAt: '',
    },
    {
      id: 22,
      order: 2,
      name: '카페라떼',
      price: 5000,
      category: 'COFFEE',
      updatedAt: '',
    },
  ],
  draftBatch: null,
}

const previewBatch: MenuBatch = {
  batchId: 9,
  baseMenuRevision: 3,
  uploadedAt: '',
  savedAt: null,
  failReason: null,
  failedImages: [],
  detectedItems: [
    {
      itemId: 101,
      order: 1,
      name: '아메리카노',
      price: 4800,
      category: 'COFFEE',
      priceReviewRequired: false,
    },
    {
      itemId: 102,
      order: 2,
      name: '카페라떼',
      price: 5300,
      category: 'COFFEE',
      priceReviewRequired: true,
    },
    {
      itemId: 103,
      order: 3,
      name: '얼그레이 티',
      price: 5500,
      category: 'TEA',
      priceReviewRequired: true,
    },
  ],
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null || !('response' in error))
    return fallback
  const response = (
    error as {
      response?: {
        status?: number
        data?: {
          message?: string
          data?: { fieldErrors?: { message?: string }[] }
        }
      }
    }
  ).response
  if (response?.status === 409)
    return '다른 변경사항이 저장되었습니다. 새로고침 후 다시 확인해주세요.'
  return (
    response?.data?.data?.fieldErrors?.[0]?.message ??
    response?.data?.message ??
    fallback
  )
}

function isUnauthorized(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

function toSavedForm(list: MenuList): FormItem[] {
  return list.items.map((item) => ({
    id: item.id,
    order: item.order,
    name: item.name,
    price: String(item.price),
    category: item.category,
    priceReviewRequired: false,
  }))
}

function toDetectedForm(batch: MenuBatch): FormItem[] {
  return batch.detectedItems.map((item) => ({
    id: item.itemId,
    order: item.order,
    name: item.name,
    price: item.price === null ? '' : String(item.price),
    category: item.category ?? '',
    priceReviewRequired: item.priceReviewRequired,
  }))
}

export function MenuPage({ preview = false }: { preview?: boolean }) {
  const navigate = useNavigate()
  const reviewRef = useRef<HTMLFormElement>(null)
  const uploadPanelRef = useRef<HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [list, setList] = useState<MenuList | null>(
    preview ? previewList : null,
  )
  const [batch, setBatch] = useState<MenuBatch | null>(
    preview ? previewBatch : null,
  )
  const [batchStatus, setBatchStatus] = useState<MenuBatchStatus | null>(
    preview ? 'COMPLETED' : null,
  )
  const [items, setItems] = useState<FormItem[]>(
    preview ? toDetectedForm(previewBatch) : [],
  )
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(!preview)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [focusReview, setFocusReview] = useState(false)
  const [isEditingMenu, setIsEditingMenu] = useState(false)
  const [isReuploading, setIsReuploading] = useState(false)
  const batchId = batch?.batchId
  const hasSavedMenus = Boolean(list?.items.length)
  const hasMenuChanges =
    !!list && JSON.stringify(items) !== JSON.stringify(toSavedForm(list))
  const showUploadPanel =
    preview ||
    isReuploading ||
    (!loading &&
      !hasSavedMenus &&
      (!batch ||
        batchStatus === 'FAILED' ||
        (batchStatus === 'COMPLETED' && !items.length)))
  const showMenuEditor = Boolean(
    list &&
    items.length > 0 &&
    ((batch && batchStatus === 'COMPLETED') || (!batch && isEditingMenu)),
  )
  const showSavedMenu = Boolean(list && list.items.length > 0 && !isEditingMenu)

  const loadList = async () => {
    const next = await getMenuList()
    setList(next)
    if (next.draftBatch) {
      const result = await getMenuBatch(next.draftBatch.batchId)
      setBatch(result.data)
      setBatchStatus(result.status)
      setItems(result.status === 'COMPLETED' ? toDetectedForm(result.data) : [])
      if (result.status === 'COMPLETED') setFocusReview(true)
    } else {
      setBatch(null)
      setBatchStatus(null)
      setItems(toSavedForm(next))
    }
  }

  useEffect(() => {
    if (preview) return
    let active = true
    getMenuList()
      .then(async (next) => {
        if (!active) return
        setList(next)
        if (next.draftBatch) {
          const result = await getMenuBatch(next.draftBatch.batchId)
          if (!active) return
          setBatch(result.data)
          setBatchStatus(result.status)
          setItems(
            result.status === 'COMPLETED' ? toDetectedForm(result.data) : [],
          )
          if (result.status === 'COMPLETED') setFocusReview(true)
        } else {
          setItems(toSavedForm(next))
        }
      })
      .catch((requestError) => {
        if (!active) return
        if (isUnauthorized(requestError)) navigate('/login')
        else
          setError(
            errorMessage(requestError, '메뉴 정보를 불러오지 못했습니다.'),
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [navigate, preview])

  useEffect(() => {
    if (
      preview ||
      !batchId ||
      (batchStatus !== 'PENDING' && batchStatus !== 'PROCESSING')
    )
      return
    let active = true
    const timer = window.setInterval(() => {
      getMenuBatch(batchId)
        .then((result) => {
          if (!active) return
          setBatch(result.data)
          setBatchStatus(result.status)
          if (result.status === 'COMPLETED') {
            setItems(toDetectedForm(result.data))
            setFocusReview(true)
          }
        })
        .catch((requestError) => {
          if (!active) return
          if (isUnauthorized(requestError)) navigate('/login')
          else
            setError(
              errorMessage(requestError, '분석 상태를 확인하지 못했습니다.'),
            )
          window.clearInterval(timer)
        })
    }, 3000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [batchId, batchStatus, navigate, preview])

  useEffect(() => {
    if (!focusReview || batchStatus !== 'COMPLETED' || !items.length) return
    reviewRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    setFocusReview(false)
  }, [batchStatus, focusReview, items.length])

  useEffect(() => {
    if (!isReuploading || !files.length) return
    uploadPanelRef.current?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
    })
  }, [files.length, isReuploading])

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setError('')
    const selected = Array.from(event.target.files ?? [])
    event.currentTarget.value = ''
    if (selected.length > 10 || selected.length === 0) {
      setFiles([])
      setError('메뉴판 이미지는 1장부터 10장까지 선택해주세요.')
      return
    }
    if (
      selected.some(
        (file) =>
          !['image/jpeg', 'image/png'].includes(file.type) ||
          !/\.(jpe?g|png)$/i.test(file.name) ||
          file.size === 0 ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setFiles([])
      setError(
        'JPG/PNG 이미지만 선택할 수 있으며, 각 파일은 5MiB 이하여야 합니다.',
      )
      return
    }
    setFiles(selected)
  }

  const upload = async () => {
    if (!files.length) return
    setError('')
    setSuccess('')
    setUploading(true)
    try {
      if (preview) {
        setBatch(previewBatch)
        setBatchStatus('COMPLETED')
        setItems(toDetectedForm(previewBatch))
        setFiles([])
        setIsReuploading(false)
        setFocusReview(true)
        return
      }
      const uploaded = await uploadMenuImages(files)
      const result = await getMenuBatch(uploaded.data.batchId)
      setBatch(result.data)
      setBatchStatus(result.status)
      setItems(result.status === 'COMPLETED' ? toDetectedForm(result.data) : [])
      if (result.status === 'COMPLETED') setFocusReview(true)
      setFiles([])
      setIsReuploading(false)
      if (result.status === 'FAILED')
        setError(
          '메뉴판을 인식하지 못했습니다. 다른 이미지로 다시 시도해주세요.',
        )
    } catch (requestError) {
      if (isUnauthorized(requestError)) navigate('/login')
      else setError(errorMessage(requestError, '메뉴판 업로드에 실패했습니다.'))
    } finally {
      setUploading(false)
    }
  }

  const changeItem = (id: number, update: Partial<FormItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    )
  }

  const startEditingMenu = () => {
    if (!list) return
    setItems(toSavedForm(list))
    setBatch(null)
    setBatchStatus(null)
    setIsReuploading(false)
    setIsEditingMenu(true)
    setError('')
    setSuccess('')
  }

  const cancelEditingMenu = () => {
    if (list) setItems(toSavedForm(list))
    setIsEditingMenu(false)
    setError('')
    setSuccess('')
  }

  const startReupload = () => {
    setFiles([])
    setBatch(null)
    setBatchStatus(null)
    setIsEditingMenu(false)
    setIsReuploading(true)
    setError('')
    setSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
  }

  const cancelReupload = () => {
    setFiles([])
    setIsReuploading(false)
    setError('')
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!list || !items.length) return
    setError('')
    setSuccess('')
    if (
      items.some(
        (item) =>
          !item.name.trim() ||
          item.name.trim().length > 100 ||
          !/^\d+$/.test(item.price) ||
          Number(item.price) > 1_000_000 ||
          item.category === '',
      )
    ) {
      setError(
        '메뉴명, 가격(0~1,000,000원), 카테고리를 확인해주세요. 인식되지 않은 값은 입력이 필요합니다.',
      )
      return
    }
    const values = items.map((item) => ({
      name: item.name.trim(),
      price: Number(item.price),
      category: item.category as MenuCategory,
      order: item.order,
      ...(batch ? { priceConfirmed: true } : {}),
    }))
    if (!batch && !hasMenuChanges) {
      setError('수정된 메뉴 정보가 없습니다.')
      return
    }
    setSaving(true)
    try {
      if (preview) {
        const next: MenuList = {
          menuRevision: list.menuRevision + 1,
          draftBatch: null,
          items: values.map((item, index) => ({
            id: items[index].id,
            order: item.order,
            name: item.name,
            price: item.price,
            category: item.category,
            updatedAt: '',
          })),
        }
        setList(next)
        setBatch(null)
        setBatchStatus(null)
        setItems(toSavedForm(next))
        setIsEditingMenu(false)
        setIsReuploading(false)
        setSuccess('미리보기에서 메뉴가 저장되었습니다.')
        return
      }
      if (batch) {
        await confirmMenuBatch(
          batch.batchId,
          batch.baseMenuRevision,
          values.map((item, index) => ({ ...item, itemId: items[index].id })),
        )
      } else {
        await updateMenuItems(
          list.menuRevision,
          values.map((item, index) => ({ ...item, menuId: items[index].id })),
        )
      }
      await loadList()
      setIsEditingMenu(false)
      setIsReuploading(false)
      setSuccess('메뉴 정보가 저장되었습니다.')
    } catch (requestError) {
      if (isUnauthorized(requestError)) navigate('/login')
      else
        setError(errorMessage(requestError, '메뉴 정보를 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const refresh = async () => {
    setError('')
    setLoading(true)
    try {
      await loadList()
    } catch (requestError) {
      if (isUnauthorized(requestError)) navigate('/login')
      else
        setError(errorMessage(requestError, '메뉴 정보를 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="메뉴판 관리" backTo="/profile" tone="white">
      <div className="menu-page page-stack">
        <input
          ref={fileInputRef}
          id="menu-images"
          className="menu-file-input"
          aria-label="메뉴판 이미지 선택"
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          multiple
          onChange={selectFiles}
          disabled={uploading || saving}
        />
        <header className="menu-page-header">
          <div className="menu-page-index">
            <span>STORE RECORD / 03</span>
            <span>MEMME ARCHIVE</span>
          </div>
          <h1>우리 매장 메뉴판</h1>
          <p>
            {showSavedMenu && !batch
              ? '저장된 메뉴를 확인하고 수정하거나 메뉴판 사진을 다시 올릴 수 있어요.'
              : '메뉴판을 올리고 인식한 메뉴를 확인해 저장하세요.'}
          </p>
          {preview && (
            <p className="menu-preview-label">
              샘플 화면 · 실제 AI 분석과 서버 저장은 로그인 후 이용할 수 있어요.
            </p>
          )}
        </header>

        {showUploadPanel && (
          <section
            className="menu-panel"
            aria-labelledby="menu-upload-heading"
            ref={uploadPanelRef}
          >
            <div className="menu-section-heading">
              <span className="menu-section-number">01</span>
              <div>
                <p className="menu-section-kicker">IMAGE UPLOAD</p>
                <h2 id="menu-upload-heading">메뉴판 사진 올리기</h2>
              </div>
            </div>
            <p className="menu-section-description">
              앨범에서 메뉴판 이미지를 선택해주세요.
            </p>
            <label className="menu-upload-target" htmlFor="menu-images">
              <span className="menu-upload-icon" aria-hidden="true">
                ↑
              </span>
              <strong>
                {files.length > 0
                  ? `${files.length}장 선택됨`
                  : '메뉴판 이미지 선택'}
              </strong>
              <small>JPG · PNG / 최대 10장 / 장당 5MiB</small>
            </label>
            <button
              className="menu-primary-button"
              type="button"
              onClick={upload}
              disabled={!files.length || uploading || saving}
            >
              {uploading ? '메뉴를 인식하고 있어요…' : '메뉴판 분석하기'}
            </button>
            {isReuploading && hasSavedMenus && !batch && (
              <button
                className="menu-secondary-button menu-cancel-reupload"
                type="button"
                onClick={cancelReupload}
                disabled={uploading || saving}
              >
                취소
              </button>
            )}
            {batch && (
              <p className="menu-note">
                새 메뉴판을 저장하면 기존 메뉴 목록이 교체됩니다.
              </p>
            )}
          </section>
        )}

        {error && (
          <p className="menu-alert" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="menu-success" role="status">
            {success}
          </p>
        )}
        {loading && <p role="status">메뉴 정보를 불러오는 중…</p>}
        {!loading && !list && (
          <button type="button" onClick={refresh}>
            다시 불러오기
          </button>
        )}

        {batch &&
          (batchStatus === 'PENDING' || batchStatus === 'PROCESSING') && (
            <section className="menu-panel" role="status">
              <h2>메뉴를 분석하고 있어요</h2>
              <p>잠시만 기다려주세요. 이 화면에서 결과를 확인할 수 있습니다.</p>
            </section>
          )}
        {batch && batchStatus === 'FAILED' && (
          <section className="menu-panel">
            <h2>메뉴 인식에 실패했어요</h2>
            <p>이미지를 확인한 뒤 다시 업로드해주세요.</p>
          </section>
        )}
        {batch &&
          batchStatus === 'COMPLETED' &&
          batch.failedImages.length > 0 && (
            <p className="menu-alert" role="alert">
              {batch.failedImages
                .map((image) => `${image.order}번째`)
                .join(', ')}{' '}
              이미지는 인식하지 못했습니다. 추출된 메뉴를 확인해주세요.
            </p>
          )}
        {batch && batchStatus === 'COMPLETED' && items.length === 0 && (
          <section className="menu-panel">
            <h2>추출된 메뉴가 없어요</h2>
            <p>다른 메뉴판 이미지를 올려주세요.</p>
          </section>
        )}
        {list && !batch && items.length === 0 && !loading && !hasSavedMenus && (
          <section className="menu-panel">
            <h2>등록된 메뉴가 없어요</h2>
            <p>메뉴판 사진을 올려 첫 메뉴를 등록해주세요.</p>
          </section>
        )}
        {showMenuEditor && (
          <form
            className="menu-panel menu-items"
            onSubmit={save}
            ref={reviewRef}
          >
            <div className="menu-section-heading">
              <span className="menu-section-number">02</span>
              <div>
                <p className="menu-section-kicker">
                  {batch ? 'REVIEW & CONFIRM' : 'EDIT MENU'}
                </p>
                <h2>{batch ? '인식된 메뉴 확인' : '메뉴 수정'}</h2>
              </div>
            </div>
            <p>
              {batch
                ? '인식된 내용이 맞으면 그대로 저장하세요. 수정할 부분만 바꾸면 됩니다.'
                : '메뉴 정보를 수정한 뒤 변경사항을 저장해주세요.'}
            </p>
            {items.map((item, index) => (
              <fieldset key={item.id} className="menu-item">
                <legend>메뉴 {String(index + 1).padStart(2, '0')}</legend>
                <label>
                  메뉴명
                  <input
                    value={item.name}
                    maxLength={100}
                    onChange={(event) =>
                      changeItem(item.id, { name: event.target.value })
                    }
                  />
                </label>
                <label>
                  가격 (원)
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    value={item.price}
                    onChange={(event) =>
                      changeItem(item.id, {
                        price: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  카테고리
                  <select
                    value={item.category}
                    onChange={(event) =>
                      changeItem(item.id, {
                        category: event.target.value as MenuCategory,
                      })
                    }
                  >
                    <option value="" disabled>
                      카테고리 선택
                    </option>
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                {item.priceReviewRequired && (
                  <p className="menu-price-review-note">
                    {item.price
                      ? '인식된 가격을 확인해주세요.'
                      : '가격을 인식하지 못했어요. 입력 후 저장해주세요.'}
                  </p>
                )}
              </fieldset>
            ))}
            <div
              className={`menu-edit-actions${batch ? ' menu-edit-actions--single' : ''}`}
            >
              {!batch && (
                <button
                  className="menu-secondary-button"
                  type="button"
                  onClick={cancelEditingMenu}
                  disabled={saving || uploading}
                >
                  취소
                </button>
              )}
              <button
                className="menu-primary-button"
                type="submit"
                disabled={saving || uploading || (!batch && !hasMenuChanges)}
              >
                {saving
                  ? '저장하는 중…'
                  : batch
                    ? '저장하기'
                    : '변경사항 저장하기'}
              </button>
            </div>
          </form>
        )}
        {showSavedMenu && list && (
          <section className="menu-panel menu-current-panel">
            <div className="menu-section-heading">
              <span className="menu-section-number">{batch ? '03' : '02'}</span>
              <div>
                <p className="menu-section-kicker">
                  {batch ? 'CURRENT MENU' : 'SAVED MENU'}
                </p>
                <h2>{batch ? '현재 저장된 메뉴' : '저장된 메뉴'}</h2>
              </div>
            </div>
            <p>
              {batch
                ? '새 메뉴판을 저장하기 전까지 아래 메뉴가 유지됩니다.'
                : '수정하거나 다시 올릴 메뉴판 사진을 선택해주세요.'}
            </p>
            <ul className="menu-current-list">
              {list.items.map((item) => (
                <li key={item.id}>
                  <div className="menu-current-item-copy">
                    <strong>{item.name}</strong>
                    <span>
                      {categories.find(
                        (category) => category.value === item.category,
                      )?.label ?? '기타'}
                    </span>
                  </div>
                  <strong className="menu-current-price">
                    {item.price.toLocaleString()}원
                  </strong>
                </li>
              ))}
            </ul>
            {(!batch ||
              batchStatus === 'FAILED' ||
              (batchStatus === 'COMPLETED' && !items.length)) && (
              <div className="menu-management-actions">
                <button
                  className="menu-secondary-button"
                  type="button"
                  onClick={startEditingMenu}
                  disabled={saving || uploading}
                >
                  수정하기
                </button>
                <button
                  className="menu-primary-button"
                  type="button"
                  onClick={startReupload}
                  disabled={saving || uploading}
                >
                  사진 다시 올리기
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  )
}
