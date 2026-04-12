# SmartXray API 文档

> 版本: 1.0.0
> 更新时间: 2026-04-04
> Base URL: `http://localhost:9091`

---

## 📋 目录

1. [认证接口](#认证接口)
2. [用户管理接口](#用户管理接口)
3. [系统设置接口](#系统设置接口)
4. [防火墙接口](#防火墙接口)
5. [自助服务接口](#自助服务接口)
6. [错误码](#错误码)

---

## 🔐 认证接口

### POST /api/login

用户登录

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**请求示例:**

```json
{
  "username": "admin",
  "password": "your_password"
}
```

**响应示例:**

```json
{
  "ok": true,
  "token": "abc123...",
  "isAdmin": true
}
```

**错误响应:**

```json
{
  "error": "用户名或密码错误"
}
```

---

### POST /api/logout

用户登出

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 否 | 用户 token |

**请求示例:**

```json
{
  "token": "abc123..."
}
```

**响应示例:**

```json
{
  "ok": true
}
```

---

### POST /api/verify-token

验证 token 有效性

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 要验证的 token |

**请求示例:**

```json
{
  "token": "abc123..."
}
```

**响应示例:**

管理员 token:
```json
{
  "valid": true,
  "isAdmin": true
}
```

用户 token:
```json
{
  "valid": true,
  "isAdmin": false,
  "user": {
    "id": 1,
    "name": "test_user"
  }
}
```

---

## 👥 用户管理接口

> 以下接口需要管理员权限

### GET /api/users

获取用户列表

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| page | number | 否 | 页码（默认 1） |
| pageSize | number | 否 | 每页数量（默认 20） |
| keyword | string | 否 | 搜索关键词 |

**请求示例:**

```
GET /api/users?token=abc123&page=1&pageSize=20&keyword=test
```

**响应示例:**

```json
{
  "ok": true,
  "users": [
    {
      "id": 1,
      "name": "test_user",
      "port": 10001,
      "http_port": 20001,
      "uuid": "xxx-xxx-xxx",
      "protocol": "socks",
      "enabled": 1,
      "expires_at": null,
      "created_at": "2026-04-04T10:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

---

### POST /api/users

创建用户

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| name | string | 是 | 用户名称 |
| protocol | string | 否 | 协议类型（默认 socks） |
| port | number | 否 | 指定端口 |
| username | string | 否 | 登录用户名 |
| password | string | 否 | 登录密码 |
| expires_at | string | 否 | 过期时间（ISO 格式） |
| note | string | 否 | 备注 |

**请求示例:**

```json
{
  "token": "abc123",
  "name": "new_user",
  "protocol": "socks",
  "username": "user1",
  "password": "pass123",
  "expires_at": "2026-12-31T23:59:59.000Z",
  "note": "测试用户"
}
```

**响应示例:**

```json
{
  "ok": true,
  "user": {
    "id": 2,
    "name": "new_user",
    "port": 10002,
    "http_port": 20002,
    "uuid": "xxx-xxx-xxx",
    "protocol": "socks",
    "username": "user1",
    "password": "pass123"
  }
}
```

---

### GET /api/users/:id

获取单个用户详情

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| id | number | 是 | 用户 ID（路径参数） |

**响应示例:**

```json
{
  "ok": true,
  "user": {
    "id": 1,
    "name": "test_user",
    "port": 10001,
    "http_port": 20001,
    "uuid": "xxx-xxx-xxx",
    "protocol": "socks",
    "username": "test",
    "password": "test123",
    "enabled": 1,
    "expires_at": null,
    "note": "",
    "created_at": "2026-04-04T10:00:00.000Z"
  }
}
```

---

### PUT /api/users/:id

更新用户信息

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| id | number | 是 | 用户 ID（路径参数） |
| name | string | 否 | 用户名称 |
| username | string | 否 | 登录用户名 |
| password | string | 否 | 登录密码 |
| enabled | number | 否 | 启用状态（0/1） |
| expires_at | string | 否 | 过期时间 |
| note | string | 否 | 备注 |

**请求示例:**

```json
{
  "token": "abc123",
  "name": "updated_user",
  "enabled": 1,
  "note": "更新备注"
}
```

**响应示例:**

```json
{
  "ok": true,
  "message": "用户更新成功"
}
```

---

### DELETE /api/users/:id

删除用户

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| id | number | 是 | 用户 ID（路径参数） |

**响应示例:**

```json
{
  "ok": true,
  "message": "用户删除成功"
}
```

---

### POST /api/users/:id/enable

启用用户

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| id | number | 是 | 用户 ID（路径参数） |

**响应示例:**

```json
{
  "ok": true,
  "message": "用户已启用"
}
```

---

### POST /api/users/:id/disable

禁用用户

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| id | number | 是 | 用户 ID（路径参数） |

**响应示例:**

```json
{
  "ok": true,
  "message": "用户已禁用"
}
```

---

### POST /api/users/:id/reset-password

重置用户密码

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| id | number | 是 | 用户 ID（路径参数） |
| password | string | 否 | 新密码（不传则随机生成） |

**请求示例:**

```json
{
  "token": "abc123",
  "password": "new_password"
}
```

**响应示例:**

```json
{
  "ok": true,
  "password": "new_password"
}
```

---

## ⚙️ 系统设置接口

### GET /api/settings

获取系统设置

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |

**响应示例:**

```json
{
  "ok": true,
  "settings": {
    "admin_password": "••••••",
    "api_port": "9091",
    "enable_self_service": "1",
    "default_protocol": "socks",
    "smtp_host": "",
    "smtp_port": "",
    "smtp_user": "",
    "smtp_pass": "••••••"
  }
}
```

---

### PUT /api/settings

更新系统设置

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| settings | object | 是 | 设置对象 |

**请求示例:**

```json
{
  "token": "abc123",
  "settings": {
    "api_port": "9091",
    "enable_self_service": "1",
    "default_protocol": "socks"
  }
}
```

**响应示例:**

```json
{
  "ok": true,
  "message": "设置保存成功"
}
```

---

## 🔥 防火墙接口

### POST /api/firewall/sync

同步所有端口

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |

**响应示例:**

```json
{
  "ok": true,
  "message": "端口同步完成",
  "opened": 50,
  "closed": 10
}
```

---

### POST /api/firewall/open/:port

开放指定端口

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| port | number | 是 | 端口号（路径参数） |

**响应示例:**

```json
{
  "ok": true,
  "message": "端口 10001 已开放"
}
```

---

### POST /api/firewall/close/:port

关闭指定端口

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 管理员 token |
| port | number | 是 | 端口号（路径参数） |

**响应示例:**

```json
{
  "ok": true,
  "message": "端口 10001 已关闭"
}
```

---

## 🛠️ 自助服务接口

### POST /api/selfservice/verify

验证邮箱并发送验证码

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |

**请求示例:**

```json
{
  "email": "user@example.com"
}
```

**响应示例:**

```json
{
  "ok": true,
  "message": "验证码已发送"
}
```

---

### POST /api/selfservice/apply

申请新用户

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| code | string | 是 | 验证码 |
| name | string | 是 | 用户名称 |
| protocol | string | 否 | 协议类型 |

**请求示例:**

```json
{
  "email": "user@example.com",
  "code": "123456",
  "name": "new_user",
  "protocol": "socks"
}
```

**响应示例:**

```json
{
  "ok": true,
  "user": {
    "name": "new_user",
    "port": 10001,
    "username": "user1",
    "password": "random123",
    "uuid": "xxx-xxx-xxx"
  }
}
```

---

### GET /api/selfservice/user/:name

查询用户信息（自助）

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 用户名称（路径参数） |

**响应示例:**

```json
{
  "ok": true,
  "user": {
    "name": "test_user",
    "port": 10001,
    "username": "test",
    "password": "test123",
    "uuid": "xxx-xxx-xxx",
    "enabled": 1,
    "expires_at": null
  }
}
```

---

## ❌ 错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（token 无效或过期） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

**错误响应格式:**

```json
{
  "error": "错误描述信息"
}
```

---

## 📝 使用示例

### 使用 curl 调用 API

**登录:**

```bash
curl -X POST http://localhost:9091/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
```

**获取用户列表:**

```bash
curl "http://localhost:9091/api/users?token=YOUR_TOKEN&page=1&pageSize=20"
```

**创建用户:**

```bash
curl -X POST http://localhost:9091/api/users \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN","name":"new_user","protocol":"socks"}'
```

---

## 🔧 注意事项

1. **Token 安全**: Token 有效期为 24 小时，过期后需要重新登录
2. **权限控制**: 用户管理接口需要管理员权限
3. **端口范围**: 
   - SOCKS 端口: 10000-19999
   - HTTP 端口: 20000-29999
   - 固定端口: 30000-39999
4. **并发限制**: 建议不要同时发起大量请求
5. **数据备份**: 定期备份 `data/smartxray.db` 数据库文件

---

## 📚 相关文档

- [代码风格指南](./CODING_STYLE.md)
- [重构总结](./REFACTORING_SUMMARY.md)
- [优化任务](./OPTIMIZATION_TASKS.md)