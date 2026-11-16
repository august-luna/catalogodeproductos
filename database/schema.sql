  CREATE DATABASE IF NOT EXISTS db_tienda_august
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE db_tienda_august;

CREATE TABLE IF NOT EXISTS tb_categorias (
  pk_clave_cat INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (pk_clave_cat)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tb_productos (
  pk_clave_pro INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  fk_clave_cat INT NOT NULL,
  descripcion TEXT DEFAULT NULL,
  stock INT DEFAULT NULL,
  txt_foto_pro VARCHAR(1000)
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (pk_clave_pro),
  KEY fk_productos_categorias (fk_clave_cat),
  CONSTRAINT fk_productos_categorias
    FOREIGN KEY (fk_clave_cat)
    REFERENCES tb_categorias (pk_clave_cat)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tb_estatus_pedidos (
  pk_clave_est INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  descripcion VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (pk_clave_est)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tb_usuarios (
  pk_clave_usu INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  rol ENUM('usuario', 'admin') NOT NULL DEFAULT 'usuario',
  PRIMARY KEY (pk_clave_usu),
  UNIQUE KEY usuario (usuario)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tb_pedidos (
  pk_clave_ped INT NOT NULL AUTO_INCREMENT,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fk_clave_est INT NOT NULL,
  fk_clave_usu INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  observaciones TEXT DEFAULT NULL,
  PRIMARY KEY (pk_clave_ped),
  KEY fk_pedidos_estatus (fk_clave_est),
  KEY fk_pedidos_usuarios (fk_clave_usu),
  CONSTRAINT fk_pedidos_estatus FOREIGN KEY (fk_clave_est)
    REFERENCES tb_estatus_pedidos (pk_clave_est)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pedidos_usuarios FOREIGN KEY (fk_clave_usu)
    REFERENCES tb_usuarios (pk_clave_usu)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tb_detalle_pedidos (
  pk_clave_det INT NOT NULL AUTO_INCREMENT,
  precio DECIMAL(10, 2) NOT NULL,
  fk_clave_ped INT NOT NULL,
  fk_clave_pro INT NOT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (precio * cantidad) STORED,
  PRIMARY KEY (pk_clave_det),
  KEY fk_detalle_pedidos (fk_clave_ped),
  KEY fk_detalle_productos (fk_clave_pro),
  CONSTRAINT fk_detalle_pedidos FOREIGN KEY (fk_clave_ped)
    REFERENCES tb_pedidos (pk_clave_ped)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_detalle_productos FOREIGN KEY (fk_clave_pro)
    REFERENCES tb_productos (pk_clave_pro)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
