import { describe, expect, test, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('../../../shared/api/http', () => ({
  http: { post },
}))

import { completeSignup } from './signupApi'

describe('회원가입 API', () => {
  test('가입 완료 요청에 가입 토큰 헤더를 전달한다', async () => {
    post.mockResolvedValue({
      data: {
        message: '회원가입이 완료되었습니다.',
        data: {
          user: { id: 1, email: 'owner@memme.kr' },
          store: { id: 2, storeName: '맴매카페' },
          next: 'LOGIN',
        },
      },
    })

    await completeSignup('temporary-token', {
      storeName: '맴매카페',
      businessRegNumber: '1234567890',
      businessVerificationId: 11,
      postalCode: '12345',
      address: '서울특별시 강남구',
      addressDetail: '',
      businessHours: [],
    })

    expect(post).toHaveBeenCalledWith(
      '/v1/auth/signup/business',
      expect.any(Object),
      { headers: { 'Signup-Token': 'temporary-token' } },
    )
  })
})
