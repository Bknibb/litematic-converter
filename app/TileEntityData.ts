import { SchematicReader } from "@kleppe/litematic-reader/dist/lib/litematic";

export class TileEntityData {
    constructor(schematic: SchematicReader) {
        this.schematic = schematic;
        const regions = Object.keys(schematic.nbtData['Regions']);
        for (const regionName of regions) {
            const region = schematic.nbtData['Regions'][regionName];
            if (region['TileEntities']) {
                const tileEntities = region['TileEntities'];
                for (const tileEntityData of tileEntities) {
                    const tileEntity = new TileEntity(tileEntityData);
                    this.tileEntities.push(tileEntity);
                }
            }
        }
    }
    private schematic: SchematicReader;
    public tileEntities: Array<TileEntity> = new Array<TileEntity>();
    public getTileEntityByPosition(x: number, y: number, z: number): TileEntity | undefined {
        for (const tileEntity of this.tileEntities) {
            if (tileEntity.x === x && tileEntity.y === y && tileEntity.z === z) {
                return tileEntity;
            }
        }
        return undefined;
    }
}
export class TileEntity {
    constructor(tileEntityData: {[key: string]: unknown;}) {
        this.tileEntityData = tileEntityData;
        this.id = tileEntityData['id'] as string;
        this.x = tileEntityData['x'] as number;
        this.y = tileEntityData['y'] as number;
        this.z = tileEntityData['z'] as number;
    }
    public tileEntityData: {[key: string]: unknown;};
    public id: string;
    public x: number;
    public y: number;
    public z: number;
}