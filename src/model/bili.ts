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

export { Bili };
