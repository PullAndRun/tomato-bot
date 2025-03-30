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

export { Group };
