# SmartXray xray-ctl 代码优化任务清单

> 创建时间: 2026-04-04
> 最后更新: 2026-04-04
> 文件: `smartxray/src/xray-ctl` (2159行)

---

## 📊 总体进度

- **总任务数**: 15
- **已完成**: 6
- **进行中**: 0
- **待开始**: 9

---

## 🔴 优先级 1 - 关键结构问题

### 任务 1.1: 拆分文件结构
- **状态**: ✅ 已完成
- **描述**: 将 2159 行的单文件拆分为独立模块
- **目标模块**:
  - [x] `database.js` - 数据库操作（getSetting, setSetting, db()）
  - [x] `firewall.js` - 防火墙管理（firewallOpen, firewallClose, extFwOp）
  - [x] `user-manager.js` - 用户管理（cmdUser 相关函数）
  - [x] `reality.js` - Reality 配置（cmdReality, getRealityConfig）
  - [x] `api-server.js` - Web API（startApiServer）
  - [x] `config.js` - 配置管理（cmdConfig, 路径常量）
- **预计工作量**: 大

### 任务 1.2: 重构 startApiServer 函数
- **状态**: ✅ 已完成
- **依赖**: 任务 1.1
- **描述**: 将 600+ 行的函数拆分为路由模块
- **目标**:
  - [x] 创建 `routes/auth.js` - 登录/登出 API
  - [x] 创建 `routes/users.js` - 用户管理 API
  - [x] 创建 `routes/settings.js` - 设置 API
  - [x] 创建 `routes/selfservice.js` - 自助申请 API
  - [x] 创建 `routes/firewall.js` - 防火墙 API
  - [x] 创建 `routes/index.js` - 路由索引
  - [x] 创建 `utils.js` - 工具函数模块
  - [x] 修复循环依赖问题
- **预计工作量**: 大

### 任务 1.3: 创建数据库访问层 (DAO)
- **状态**: ✅ 已完成
- **描述**: 封装数据库操作，避免重复的 prepare 调用
- **目标函数**:
  - [x] `UserDao.getById(id)`
  - [x] `UserDao.getByName(name)`
  - [x] `UserDao.getAll()`
  - [x] `UserDao.create(userData)`
  - [x] `UserDao.update(id, data)`
  - [x] `UserDao.delete(id)`
  - [x] `UserDao.getExpired()`
  - [x] `SettingDao` - 配置访问对象
  - [x] `VerificationDao` - 验证码访问对象
  - [x] 预编译语句缓存优化
- **预计工作量**: 中

### 任务 1.4: 统一错误处理机制
- **状态**: ✅ 已完成
- **描述**: 创建全局错误处理器，统一错误响应格式
- **目标**:
  - [x] 创建 `AppError` 类
  - [x] 创建 `ValidationError` 类
  - [x] 创建 `AuthError` 类
  - [x] 创建 `DatabaseError` 类
  - [x] 实现 `handleError(err, res)` 函数
  - [x] 实现 `asyncHandler` 包装器
  - [x] 定义错误码常量 (ErrorCodes)
  - [x] 实现 `createErrorResponse` 和 `createSuccessResponse` 工具函数
- **预计工作量**: 中

---

## 🟡 优先级 2 - 性能和效率

### 任务 2.1: 实现配置缓存
- **状态**: ✅ 已完成
- **描述**: 减少 getSetting() 的数据库查询
- **目标**:
  - [x] 创建 `configCache` 对象
  - [x] 实现 `loadCache()` 初始化函数
  - [x] 实现 `getCachedSetting()` 优先读缓存
  - [x] 实现 `setCachedSetting()` 同时更新缓存
  - [x] 添加缓存失效机制（TTL 过期检查）
  - [x] 实现批量操作函数
  - [x] 添加缓存状态监控
- **预计工作量**: 小

### 任务 2.2: 优化用户认证效率
- **状态**: ⬜ 待开始
- **描述**: 避免遍历所有用户验证 token
- **目标**:
  - [ ] 创建 token 到用户 ID 的映射表
  - [ ] 实现 `tokenCache` 内存缓存
  - [ ] 修改 `getUserFromToken()` 使用缓存
  - [ ] 用户更新时刷新缓存
- **预计工作量**: 小

### 任务 2.3: 优化定时器清理逻辑
- **状态**: ⬜ 待开始
- **描述**: 改进 cleanupExpired() 函数
- **目标**:
  - [ ] 添加批量删除（避免循环删除）
  - [ ] 实现分页处理大量数据
  - [ ] 添加清理日志统计
  - [ ] 优化清理频率（可配置）
- **预计工作量**: 小

### 任务 2.4: 优化端口分配算法
- **状态**: ⬜ 待开始
- **描述**: 改进 allocPort() 函数性能
- **目标**:
  - [ ] 实现端口位图（bitmap）
  - [ ] 预加载已使用端口
  - [ ] 快速查找可用端口
  - [ ] 添加端口分配统计
- **预计工作量**: 小

---

## 🟢 优先级 3 - 代码质量

### 任务 3.1: 添加输入验证
- **状态**: ✅ 已完成
- **描述**: 为 API 端点添加参数验证
- **目标**:
  - [x] 创建 `validators.js` 验证工具
  - [x] 实现常用验证函数（isEmpty, isNonEmptyString, isValidUsername, isValidPassword, isValidPort, isValidEmail, isValidUUID, isValidIP, isValidDate, isValidBoolean, isValidLength, isInRange）
  - [x] 实现 `createValidator` 验证中间件
  - [x] 实现常用验证规则（required, username, password, port, email, uuid）
  - [x] 返回友好的验证错误信息
- **预计工作量**: 中

### 任务 3.2: 提取硬编码常量
- **状态**: ⬜ 待开始
- **描述**: 将散落的硬编码值提取为常量
- **目标**:
  - [ ] 创建 `constants.js` 常量文件
  - [ ] 定义端口范围常量
  - [ ] 定义超时时间常量
  - [ ] 定义默认值常量
  - [ ] 替换所有硬编码引用
- **预计工作量**: 小

### 任务 3.3: 实现分级日志系统
- **状态**: ⬜ 待开始
- **描述**: 替换简单的 console.log
- **目标**:
  - [ ] 创建 `logger.js` 日志模块
  - [ ] 实现 debug/info/warn/error 级别
  - [ ] 支持日志文件输出
  - [ ] 替换所有 console.log 调用
  - [ ] 添加日志轮转机制
- **预计工作量**: 中

### 任务 3.4: 统一变量命名规范
- **状态**: ⬜ 待开始
- **描述**: 统一使用 camelCase 命名
- **目标**:
  - [ ] 审查所有变量命名
  - [ ] 将 snake_case 改为 camelCase
  - [ ] 更新数据库字段映射
  - [ ] 更新 API 响应字段
- **预计工作量**: 中

### 任务 3.5: 添加 JSDoc 文档注释
- **状态**: ⬜ 待开始
- **描述**: 为关键函数添加文档
- **目标**:
  - [ ] 为所有导出函数添加 JSDoc
  - [ ] 为复杂逻辑添加注释
  - [ ] 生成 API 文档
- **预计工作量**: 中

### 任务 3.6: 合并重复的防火墙逻辑
- **状态**: ⬜ 待开始
- **描述**: 统一 userFirewall 和 ssFirewall 操作
- **目标**:
  - [ ] 创建通用 `firewallOperation(type, port, httpPort)` 函数
  - [ ] 替换所有 userFirewallOpen/Close 调用
  - [ ] 替换所有 ssFirewallOpen/Close 调用
  - [ ] 删除重复函数
- **预计工作量**: 小

### 任务 3.7: 优化字符串拼接
- **状态**: ⬜ 待开始
- **描述**: 改进 VLESS 链接等字符串构建
- **目标**:
  - [ ] 使用 URL 对象构建链接
  - [ ] 创建 `buildVlessLink()` 工具函数
  - [ ] 统一链接生成逻辑
- **预计工作量**: 小

---

## 📝 实施记录

### 2026-04-04
- [x] 完成代码分析
- [x] 创建优化任务清单
- [x] 实施任务 1.1（拆分文件结构）
- [x] 实施任务 1.2（重构 API 路由）
- [x] 创建 utils.js 工具模块
- [x] 修复循环依赖问题
- [x] 测试新模块语法

---

## 🔄 重入指南

如果任务中断，按以下步骤恢复：

1. **读取此文档** - 了解当前进度
2. **检查最后更新时间** - 确认任务状态
3. **找到第一个 ⬜ 待开始 的任务**
4. **继续实施**

### 快速恢复命令
```bash
# 查看任务文档
cat smartxray/OPTIMIZATION_TASKS.md

# 查看当前代码状态
wc -l smartxray/src/xray-ctl
```

---

## 📌 备注

- 每完成一个任务，将状态从 ⬜ 改为 ✅
- 遇到问题时在对应任务下添加备注
- 重大变更前先备份原文件