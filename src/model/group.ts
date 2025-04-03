import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Group extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  //群号
  @Column({ type: "float", unique: true })
  gid: number;
  //prompt
  @Column({ type: "text" })
  prompt_name: string;
  //自定义prompt
  @Column({ type: "text" })
  prompt: string;
  //是否在群里
  @Column({ type: "boolean", default: true })
  active: boolean;
}

function find(gid: number) {
  return Group.findOneBy({
    gid,
  });
}

async function add(gid: number) {
  const group = new Group();
  group.gid = gid;
  await group.save().catch((_) => undefined);
  return group;
}

async function findOrAdd(gid: number) {
  const group = await find(gid);
  if (!group) {
    return add(gid);
  }
  return group;
}

async function active(gid: number, active: boolean) {
  const group = await findOrAdd(gid);
  group.active = active;
  await group.save().catch((_) => undefined);
  return group;
}

export { active, findOrAdd, Group };
