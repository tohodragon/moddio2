class ThreeSprite extends THREE.Group {
    constructor(tex) {
        super();
        this.tileH = 1;
        this.tileV = 1;
        if (tex.userData.numColumns && tex.userData.numRows) {
            this.tileH = tex.userData.numColumns;
            this.tileV = tex.userData.numRows;
        }
        const currentTile = 0;
        tex.repeat.set(1 / this.tileH, 1 / this.tileV);
        const offsetX = (currentTile % this.tileH) / this.tileH;
        const offsetY = 1 - 1 / this.tileV - (Math.floor(currentTile / this.tileH) % this.tileV) / this.tileV;
        tex.offset.set(offsetX, offsetY);
        const spriteMaterial = new THREE.SpriteMaterial({ transparent: true, map: tex });
        const sprite = new THREE.Sprite(spriteMaterial);
        this.sprite = sprite;
        this.add(sprite);
    }
    setScale(sx, sy, sz = 1) {
        this.sprite.scale.set(sx, sy, sz);
    }
    setRotationY(rad) {
        this.sprite.material.rotation = rad;
    }
}
//# sourceMappingURL=ThreeSprite.js.map