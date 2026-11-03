# 웹푸시 기본 사용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 웹푸시 전용 토글 없이 허용된 브라우저의 FCM 토큰을 자동 등록한다.

**Architecture:** Firebase 메시징 모듈에서 이전 로컬 토글 상태를 등록 조건에서 제외한다. 알림 설정 화면은 권한 요청 및 등록 상태만 표시하며, 기존 로그인 후 자동 등록을 활용한다.

**Tech Stack:** React, TypeScript, Firebase Messaging, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-web-push-default-design.md`

## Tasks

- [ ] 자동 등록 조건과 설정 화면의 회귀 테스트를 먼저 작성하고 실패를 확인한다.
- [ ] 웹푸시 토글과 비활성화 경로를 제거하고 권한 요청 및 등록을 구현한다.
- [ ] 관련 테스트, 린트, 빌드를 실행하고 변경 내용을 확인한다.
