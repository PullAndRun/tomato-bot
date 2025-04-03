import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["gid", "mid", "rid"], { unique: true })
class Bili extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  //up主昵称
  @Column({ type: "text" })
  name: string;
  //群号
  @Column({ type: "float" })
  gid: number;
  //up主uid
  @Column({ type: "float" })
  mid: number;
  //直播间id
  @Column({ type: "float" })
  rid: number;
}

function find(gid: number, mid: number, rid: number) {
  return Bili.findOneBy({
    gid,
    mid,
    rid,
  });
}

async function add(name: string, gid: number, mid: number, rid: number) {
  const bili = new Bili();
  bili.name = name;
  bili.gid = gid;
  bili.mid = mid;
  bili.rid = rid;
  await bili.save().catch((_) => undefined);
  return bili;
}

async function findOrAdd(name: string, gid: number, mid: number, rid: number) {
  const bili = await find(gid, mid, rid);
  if (!bili) {
    return add(name, gid, mid, rid);
  }
  return bili;
}

async function remove(gid: number, name: string) {
  const bili = await Bili.findOneBy({ gid, name });
  if (!bili) return undefined;
  await bili.remove().catch((_) => undefined);
  return bili;
}

async function removeGroup(gid: number) {
  const bilis = await Bili.find({ where: { gid } });
  if (!bilis) return undefined;
  for (const bili of bilis) {
    await bili.remove();
  }
  return bilis;
}

async function findAll() {
  return Bili.find();
}

export { Bili, findAll, findOrAdd, remove, removeGroup };
