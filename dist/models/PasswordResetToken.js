"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetToken = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const crypto_1 = __importDefault(require("crypto"));
let PasswordResetToken = class PasswordResetToken {
    hashToken() {
        // Hash the token for database storage
        this.hashedToken = crypto_1.default.createHash('sha256').update(this.token).digest('hex');
    }
    // Generate a cryptographically secure token
    static generateToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    // Check if token is expired
    isExpired() {
        return new Date() > this.expiresAt;
    }
    // Check if token is valid (not used and not expired)
    isValid() {
        return !this.isUsed && !this.isExpired();
    }
    // Mark token as used
    markAsUsed(ipAddress, userAgent) {
        this.isUsed = true;
        this.usedAt = new Date();
        if (ipAddress)
            this.ipAddress = ipAddress;
        if (userAgent)
            this.userAgent = userAgent;
    }
    // Verify token against the stored hash
    static verifyToken(plainToken, hashedToken) {
        const hash = crypto_1.default.createHash('sha256').update(plainToken).digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken));
    }
};
exports.PasswordResetToken = PasswordResetToken;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PasswordResetToken.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], PasswordResetToken.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PasswordResetToken.prototype, "hashedToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], PasswordResetToken.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PasswordResetToken.prototype, "isUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PasswordResetToken.prototype, "usedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PasswordResetToken.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PasswordResetToken.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: 'CASCADE' }),
    __metadata("design:type", User_1.User)
], PasswordResetToken.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PasswordResetToken.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PasswordResetToken.prototype, "hashToken", null);
exports.PasswordResetToken = PasswordResetToken = __decorate([
    (0, typeorm_1.Entity)()
], PasswordResetToken);
