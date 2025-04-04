import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["gid", "name"], { unique: true })
class Plugin extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  //群名
  @Column({ type: "float" })
  gid: number;
  //插件名称
  @Column({ type: "text" })
  name: string;
  //是否启用
  @Column({ type: "boolean", default: true })
  enable: boolean;
}

function find(gid: number, name: string) {
  return Plugin.findOneBy({
    gid,
    name,
  });
}

async function add(gid: number, name: string, enable: boolean) {
  const plugin = new Plugin();
  plugin.gid = gid;
  plugin.name = name;
  plugin.enable = enable;
  await plugin.save().catch((_) => undefined);
  return plugin;
}

async function findOrAdd(gid: number, name: string, enable: boolean = true) {
  const plugin = await find(gid, name);
  if (!plugin) {
    return add(gid, name, enable);
  }
  return plugin;
}

async function update(gid: number, name: string, enable: boolean) {
  const plugin = await find(gid, name);
  if (!plugin) {
    return add(gid, name, enable);
  }
  plugin.enable = enable;
  await plugin.save().catch((_) => undefined);
  return plugin;
}

async function findByGid(gid: number) {
  return Plugin.findBy({ gid });
}

export { findByGid, findOrAdd, Plugin, update };
