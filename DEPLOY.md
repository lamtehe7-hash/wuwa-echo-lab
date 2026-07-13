# Hướng dẫn deploy lên GitHub Pages

Repo hiện **chưa phải git repo** và chưa được đẩy lên GitHub. Các bước dưới đây bạn tự chạy (agent
không tự `git init`/`commit`/`push` thay bạn).

## 1. Tạo repo trên GitHub

Vào https://github.com/new, tạo một repo mới (public hoặc private đều được — GitHub Pages qua
GitHub Actions hỗ trợ cả hai với tài khoản có Pages). Đặt tên repo tuỳ ý, ví dụ `wuwa-echo`.
**Không** tick "Initialize with README" (repo local đã có sẵn file).

## 2. Khởi tạo git ở máy local

Mở terminal tại thư mục gốc project (`e:\Claude\WuWa Echo`):

```bash
git init
git add .
git commit -m "Initial commit: WuWa Echo Optimizer"
```

`.gitignore` ở gốc đã loại trừ sẵn `node_modules/`, `app/dist/`, `*.tsbuildinfo` và 2 file nội bộ
`PROJECT_TASK.md`, `HANDOVER.md` (không đẩy lên GitHub).

> Kiểm tra nhanh trước khi commit: `git status` — đảm bảo không thấy `node_modules/` hay `dist/`
> trong danh sách file sẽ add. Nếu thấy, kiểm tra lại `.gitignore` đã đúng vị trí (gốc repo) chưa.

## 3. Trỏ remote và push

```bash
git branch -M main
git remote add origin https://github.com/<username>/<ten-repo>.git
git push -u origin main
```

## 4. Bật GitHub Pages

Trên GitHub: vào repo → **Settings → Pages** → mục **Build and deployment** → **Source** chọn
**GitHub Actions** (không chọn "Deploy from a branch").

Workflow đã có sẵn ở [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml): build app
trong thư mục `app/` (`npm ci` + `npm run build`) rồi deploy thư mục `app/dist` lên Pages, chạy tự
động mỗi khi push nhánh `main`, hoặc chạy tay qua tab **Actions → Deploy to GitHub Pages → Run
workflow** (workflow_dispatch).

## 5. Theo dõi và lấy URL

Vào tab **Actions** để xem tiến trình build/deploy. Khi job `deploy` chạy xong, URL trang sẽ hiện ở
đó và ở **Settings → Pages**, dạng:

```
https://<username>.github.io/<ten-repo>/
```

(`vite.config.ts` đã đặt `base: './'` nên app chạy đúng dù được phục vụ ở subpath `/<ten-repo>/`,
không cần chỉnh gì thêm.)

## 6. Cập nhật sau này

Mỗi lần muốn deploy bản mới: commit + push lên nhánh `main` như bình thường, workflow tự chạy lại.
