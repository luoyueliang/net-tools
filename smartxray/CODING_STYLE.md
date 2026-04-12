# SmartXray 代码风格指南

> 版本: 1.0.0
> 更新时间: 2026-04-04

---

## 📋 目录

1. [变量命名规范](#变量命名规范)
2. [函数命名规范](#函数命名规范)
3. [常量命名规范](#常量命名规范)
4. [文件命名规范](#文件命名规范)
5. [代码格式](#代码格式)
6. [注释规范](#注释规范)

---

## 变量命名规范

### 基本原则

- **语义化**: 变量名应该清晰表达其用途
- **驼峰命名**: 使用小驼峰命名法（camelCase）
- **避免缩写**: 除非是广泛认知的缩写（如 `id`, `url`, `api`）

### 普通变量

```javascript
// ✅ 正确
const userName = 'admin';
const portNumber = 8080;
const isEnabled = true;
const userList = [];

// ❌ 错误
const u = 'admin';
const p = 8080;
const flag = true;
const arr = [];
```

### 布尔变量

使用 `is`, `has`, `can`, `should` 等前缀：

```javascript
// ✅ 正确
const isActive = true;
const hasPermission = false;
const canEdit = true;
const shouldRetry = false;

// ❌ 错误
const active = true;
const permission = false;
const edit = true;
```

### 集合变量

使用复数形式或描述性后缀：

```javascript
// ✅ 正确
const users = [];
const portList = new Set();
const configMap = new Map();
const tokenCache = new Map();

// ❌ 错误
const user = [];  // 单数形式用于数组
const ports = new Set();
const configs = new Map();
```

### 临时变量

在短作用域中可以使用简短名称：

```javascript
// ✅ 正确
for (let i = 0; i < 10; i++) {
  // ...
}

const [err, result] = await someAsync();

// ❌ 错误
for (let index = 0; index < 10; index++) {  // 过长
  // ...
}
```

### 私有变量

使用下划线前缀表示私有（仅在类中使用）：

```javascript
class Database {
  constructor() {
    this._connection = null;
    this._isConnected = false;
  }
}
```

---

## 函数命名规范

### 基本原则

- **动词开头**: 函数名应该以动词开头
- **小驼峰命名**: 使用 camelCase
- **语义清晰**: 函数名应该清楚表达其行为

### 普通函数

```javascript
// ✅ 正确
function getUserById(id) { }
function createUser(data) { }
function deleteUser(id) { }
function updateUser(id, data) { }

// ❌ 错误
function user(id) { }
function create(data) { }
function del(id) { }
```

### 查询函数

使用 `get`, `find`, `search`, `query` 等动词：

```javascript
// ✅ 正确
function getUserById(id) { }
function findUserByName(name) { }
function searchUsers(keyword) { }
function queryExpiredUsers() { }
```

### 判断函数

使用 `is`, `has`, `can` 等前缀，返回布尔值：

```javascript
// ✅ 正确
function isValidPort(port) { }
function hasPermission(user) { }
function canAccess(user, resource) { }

// ❌ 错误
function checkPort(port) { }  // 不清楚返回类型
function permission(user) { }
```

### 异步函数

不需要特殊标记，但可以在注释中说明：

```javascript
// ✅ 正确
async function fetchUserData(id) { }
async function saveConfig(config) { }

// ❌ 错误
async function fetchUserDataAsync(id) { }  // 不需要 Async 后缀
```

---

## 常量命名规范

### 基本原则

- **全大写**: 使用 UPPER_SNAKE_CASE
- **分组**: 相关常量放在同一个对象中
- **语义化**: 常量名应该清楚表达其含义

### 普通常量

```javascript
// ✅ 正确
const MAX_PORT = 65535;
const MIN_PORT = 1024;
const DEFAULT_TIMEOUT = 5000;
const API_VERSION = 'v1';

// ❌ 错误
const maxPort = 65535;
const min_port = 1024;
const timeout = 5000;
```

### 分组常量

```javascript
// ✅ 正确
const PORT = {
  MIN: 1024,
  MAX: 65535,
  DEFAULT: 8080
};

const TIMEOUT = {
  HTTP: 10000,
  PROXY: 8000,
  DB: 5000
};

// ❌ 错误
const PORT_MIN = 1024;
const PORT_MAX = 65535;
const PORT_DEFAULT = 8080;
```

### 枚举常量

```javascript
// ✅ 正确
const STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error'
};

const PROTOCOLS = {
  SOCKS: 'socks',
  HTTP: 'http',
  VLESS: 'vless'
};
```

---

## 文件命名规范

### 基本原则

- **小写**: 使用小写字母
- **连字符**: 使用连字符分隔单词（kebab-case）
- **语义化**: 文件名应该清楚表达其内容

### 模块文件

```javascript
// ✅ 正确
database.js
config-cache.js
token-cache.js
user-manager.js
port-allocator.js

// ❌ 错误
Database.js
configCache.js
token_cache.js
UserManager.js
```

### 路由文件

```javascript
// ✅ 正确
routes/auth.js
routes/users.js
routes/settings.js
routes/selfservice.js

// ❌ 错误
routes/Auth.js
routes/user.js
routes/setting.js
```

### 配置文件

```javascript
// ✅ 正确
config.json
config.example.json
package.json

// ❌ 错误
Config.json
config_example.json
```

---

## 代码格式

### 缩进

使用 2 个空格缩进：

```javascript
// ✅ 正确
function example() {
  if (condition) {
    doSomething();
  }
}

// ❌ 错误
function example() {
    if (condition) {
        doSomething();
    }
}
```

### 行长度

每行最多 100 个字符，超过则换行：

```javascript
// ✅ 正错
const result = someLongFunction(
  firstParameter,
  secondParameter,
  thirdParameter
);

// ❌ 错误
const result = someLongFunction(firstParameter, secondParameter, thirdParameter, fourthParameter);
```

### 大括号

使用 K&R 风格（左大括号在同一行）：

```javascript
// ✅ 正确
if (condition) {
  doSomething();
}

function example() {
  // ...
}

// ❌ 错误
if (condition)
{
  doSomething();
}

function example()
{
  // ...
}
```

### 空行

- 函数之间使用 2 个空行
- 逻辑块之间使用 1 个空行
- 不要在文件开头或结尾使用空行

```javascript
// ✅ 正确
function first() {
  // ...
}

function second() {
  // ...
}

// ❌ 错误
function first() {
  // ...
}
function second() {
  // ...
}
```

---

## 注释规范

### 文件头注释

每个文件开头应该有文件说明：

```javascript
/**
 * 用户管理模块
 * 处理用户的增删改查操作
 */

'use strict';
```

### 函数注释

使用 JSDoc 格式：

```javascript
/**
 * 根据 ID 获取用户
 * @param {number} id - 用户 ID
 * @returns {Object|null} 用户对象或 null
 */
function getUserById(id) {
  // ...
}
```

### 行内注释

```javascript
// ✅ 正确
const port = 8080;  // 默认端口

// ❌ 错误
const port = 8080 // 默认端口（缺少空格）
```

### TODO 注释

```javascript
// TODO: 优化这个算法
// FIXME: 修复这个 bug
// HACK: 临时解决方案
```

---

## 📝 检查清单

在提交代码前，请检查：

- [ ] 变量名是否语义化
- [ ] 函数名是否以动词开头
- [ ] 常量是否全大写
- [ ] 文件名是否使用 kebab-case
- [ ] 代码缩进是否为 2 个空格
- [ ] 是否有必要的注释
- [ ] 是否遵循 JSDoc 格式

---

## 🔧 ESLint 配置建议

```json
{
  "rules": {
    "camelcase": ["error", { "properties": "always" }],
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "prefer-const": "error",
    "no-var": "error",
    "indent": ["error", 2],
    "max-len": ["warn", { "code": 100 }]
  }
}
```

---

## ✨ 总结

遵循这些规范可以：

1. **提高可读性**: 代码更容易理解
2. **降低维护成本**: 统一的风格便于维护
3. **减少错误**: 清晰的命名减少误解
4. **团队协作**: 统一的规范便于协作

**记住**: 代码是写给人看的，顺便让机器执行。