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
  active: boolean;
}

export { Plugin };
